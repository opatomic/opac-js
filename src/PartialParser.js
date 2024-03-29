/*
 * Copyright 2018-2019 Opatomic
 * Open sourced with ISC license. Refer to LICENSE for details.
 */

// Dependencies: BigInteger, BigDec, OpaDef, NEWBUF, STRDEC

/**
 * @constructor
 */
var PartialParser = function() {};

(function() {

var S_NEXTOBJ = 1;
var S_VARINT1 = 2;
var S_VARINT2 = 3;
var S_VARDEC1 = 4;
var S_VARDEC2 = 5;
var S_BIGINT  = 6;
var S_BIGDEC1 = 7;
var S_BIGDEC2 = 8;
var S_BYTES1  = 9;
var S_BYTES2  = 10;
var S_BLOB    = 11;
var S_STR     = 12;
var S_ERR     = 13;

/** @const {!OpaBuff} */
var TMPBUF = NEWBUF(8);

/** @const {!OpaBuff} */
var EMPTYBUF = NEWBUF(0);

/**
 * @constructor
 */
PartialParser = function() {
	/** @type {!Array<*>} */
	this.mContainers = [];
	/** @type {?Array} */
	this.mCurrCont = null;
	/** @type {number} */
	this.mState = S_NEXTOBJ;
	/** @type {number} */
	this.mNextState = 0;
	/** @type {number} */
	this.mNextState2 = 0;
	/** @type {number} */
	this.mVarintVal1 = 0;
	/** @type {number} */
	this.mVarintVal2 = 0;
	/** @type {number} */
	this.mVarintLen = 0;
	/** @type {number} */
	this.mDecExp = 0;
	/** @type {number} */
	this.mObjType = 0;
	/** @type {number} */
	this.mBytesIdx = 0;
	/** @type {number} */
	this.mBytesLen = 0;
	/** @type {!OpaBuff} */
	this.mBytes = EMPTYBUF;
};

/**
 * @param {!PartialParser} p
 * @param {string} msg
 */
function throwErr(p, msg) {
	p.mState = S_ERR;
	throw new Error(msg);
}

/**
 * @param {!PartialParser} p
 * @param {*} o
 */
function hitNext(p, o) {
	if (p.mCurrCont == null) {
		throwErr(p, "no array container");
	}
	p.mCurrCont.push(o);
}

/**
 * @param {!PartialParser} p
 * @param {*} o
 */
function hitNextAndReset(p, o) {
	hitNext(p, o);
	if (p.mBytes.length > 4096) {
		p.mBytes = EMPTYBUF;
	}
	p.mState = S_NEXTOBJ;
}

/**
 * @param {!PartialParser} p
 * @param {number} objType
 * @param {number} nextState
 */
function initVarint(p, objType, nextState) {
	p.mState = S_VARINT1;
	p.mNextState = nextState;
	p.mObjType = objType;
	p.mVarintVal1 = 0;
	p.mVarintVal2 = 0;
	p.mVarintLen = 0;
}

/**
 * @param {!PartialParser} p
 * @param {number} objType
 * @param {number} nextState
 */
function initBytes(p, objType, nextState) {
	initVarint(p, objType, S_BYTES1);
	p.mNextState2 = nextState;
}

/**
 * @param {!PartialParser} p
 * @param {boolean} neg
 * @return {number}
 */
function getVarint32(p, neg) {
	if (neg) {
		return 0 - getVarint32(p, false);
	}
	if (p.mVarintLen < 5) {
		return p.mVarintVal1;
	}
	var t = (p.mVarintVal2 * 4294967296) + p.mVarintVal1;
	if (!isSafeInteger(t) || t > 2147483647) {
		throwErr(p, "varint out of range");
	}
	return t;
}

/**
 * @param {number} num
 * @param {!Uint8Array} b
 * @param {number} idx
 */
function num32ToBuff(num, b, idx) {
	for (var i = 3; i >= 0; --i) {
		b[idx + i] = num & 0xFF;
		num >>>= 8;
	}
}

/**
 * @param {!PartialParser} p
 * @param {boolean} neg
 * @return {number|!BigInteger}
 */
function getVarIntVal(p, neg) {
	if (p.mVarintLen < 5) {
		return neg ? (p.mVarintVal1 == 0 ? -0 : 0 - p.mVarintVal1) : p.mVarintVal1;
	}
	var t = (p.mVarintVal2 * 4294967296) + p.mVarintVal1;
	if (isSafeInteger(t)) {
		return neg ? 0 - t : t;
	}
	num32ToBuff(p.mVarintVal2, TMPBUF, 0);
	num32ToBuff(p.mVarintVal1, TMPBUF, 4);
	return bigIntFromBytes(neg, TMPBUF, 0, 8);
}

/**
 * @param {!PartialParser} p
 * @param {number} bval
 */
function varintNextByte(p, bval) {
	if (p.mVarintLen < 4) {
		p.mVarintVal1 |= (bval & 0x7F) << (p.mVarintLen * 7);
	} else if (p.mVarintLen == 4) {
		// 4 bits go into mVarintVal1; cannot use bit-wise operations
		p.mVarintVal1 += (bval & 0x0F) * 268435456;
		// 3 bits go into mVarintVal2
		p.mVarintVal2 = (bval & 0x70) >> 4;
	} else if (p.mVarintLen < 9) {
		p.mVarintVal2 |= (bval & 0x7F) << (3 + ((p.mVarintLen - 5) * 7));
	} else {
		throwErr(p, "varint too big");
	}
	p.mVarintLen++;
}

/**
 * @param {!OpaBuff} b
 * @return {string}
 */
function getstr(b) {
	return STRDEC(b);
}

/**
 * @param {!PartialParser} p
 * @param {!PartialParser.Buff} b
 * @return {?Array}
 */
function parseNext(p, b) {
	var buff = b.data;
	var idx = b.idx;
	var stop = b.idx + b.len;
	MainLoop:
	while (true) {
		switch (p.mState) {
			case S_NEXTOBJ:
				if (idx >= stop) {
					b.idx = idx;
					b.len = 0;
					return null;
				}
				switch (buff[idx++]) {
					case CH_UNDEFINED:  hitNext(p, undefined); continue;
					case CH_NULL:       hitNext(p, null);      continue;
					case CH_FALSE:      hitNext(p, false);     continue;
					case CH_TRUE:       hitNext(p, true);      continue;
					case CH_ZERO:       hitNext(p, 0);         continue;
					case CH_NEGINF:     hitNext(p, -Infinity); continue;
					case CH_POSINF:     hitNext(p, Infinity);  continue;
					case CH_EMPTYBIN:   hitNext(p, NEWBUF(0)); continue;
					case CH_EMPTYSTR:   hitNext(p, "");        continue;
					case CH_EMPTYARRAY: hitNext(p, []);        continue;
					case CH_SORTMAX:    hitNext(p, OpaDef.SORTMAX_OBJ); continue;

					case CH_NEGVARINT: initVarint(p, CH_NEGVARINT, S_VARINT2); continue;
					case CH_POSVARINT: initVarint(p, CH_POSVARINT, S_VARINT2); continue;

					case CH_NEGBIGINT: initBytes(p, CH_NEGBIGINT, S_BIGINT); continue;
					case CH_POSBIGINT: initBytes(p, CH_POSBIGINT, S_BIGINT); continue;

					case CH_POSPOSVARDEC: initVarint(p, CH_POSPOSVARDEC, S_VARDEC1); continue;
					case CH_POSNEGVARDEC: initVarint(p, CH_POSNEGVARDEC, S_VARDEC1); continue;
					case CH_NEGPOSVARDEC: initVarint(p, CH_NEGPOSVARDEC, S_VARDEC1); continue;
					case CH_NEGNEGVARDEC: initVarint(p, CH_NEGNEGVARDEC, S_VARDEC1); continue;

					case CH_POSPOSBIGDEC: initVarint(p, CH_POSPOSBIGDEC, S_BIGDEC1); continue;
					case CH_POSNEGBIGDEC: initVarint(p, CH_POSNEGBIGDEC, S_BIGDEC1); continue;
					case CH_NEGPOSBIGDEC: initVarint(p, CH_NEGPOSBIGDEC, S_BIGDEC1); continue;
					case CH_NEGNEGBIGDEC: initVarint(p, CH_NEGNEGBIGDEC, S_BIGDEC1); continue;

					case CH_BINLPVI: initBytes(p, CH_BINLPVI, S_BLOB); continue;
					case CH_STRLPVI: initBytes(p, CH_STRLPVI, S_STR);  continue;

					case CH_ARRAYSTART:
						if (p.mCurrCont != null) {
							p.mContainers.push(p.mCurrCont);
						}
						p.mCurrCont = [];
						continue;
					case CH_ARRAYEND:
						if (p.mCurrCont == null) {
							throwErr(p, "array end token when not in array");
						}
						if (p.mContainers.length == 0) {
							var tmp = p.mCurrCont;
							p.mCurrCont = null;
							b.idx = idx;
							b.len = stop - idx;
							return tmp;
						}
						var parent = /** @type {!Array} */ (p.mContainers.pop());
						parent.push(p.mCurrCont);
						p.mCurrCont = parent;
						continue;
					default:
						throwErr(p, "unknown char");
				} // eslint-disable-line no-fallthrough

			case S_VARINT1:
				while (true) {
					if (idx >= stop) {
						b.idx = idx;
						b.len = 0;
						return null;
					}
					var bval = buff[idx++];
					varintNextByte(p, bval);
					if ((bval & 0x80) == 0) {
						p.mState = p.mNextState;
						continue MainLoop;
					}
				}
			case S_VARINT2:
				hitNext(p, getVarIntVal(p, p.mObjType == CH_NEGVARINT));
				p.mState = S_NEXTOBJ;
				continue;
			case S_BYTES1:
				p.mBytesLen = getVarint32(p, false);
				if (p.mBytes.length < p.mBytesLen) {
					p.mBytes = NEWBUF(p.mBytesLen);
				}
				p.mBytesIdx = 0;
				p.mState = S_BYTES2;
				// fall through
			case S_BYTES2:
				var numToCopy = Math.min(stop - idx, p.mBytesLen - p.mBytesIdx);
				p.mBytes.set(buff.subarray(idx, idx + numToCopy), p.mBytesIdx);
				p.mBytesIdx += numToCopy;
				idx += numToCopy;
				if (p.mBytesIdx < p.mBytesLen) {
					b.idx = idx;
					b.len = 0;
					return null;
				}
				p.mState = p.mNextState2;
				continue;
			case S_BIGINT:
				hitNextAndReset(p, bigIntFromBytes(p.mObjType == CH_NEGBIGINT, p.mBytes, 0, p.mBytesLen));
				continue;

			case S_VARDEC1:
				p.mDecExp = getVarint32(p, p.mObjType == CH_NEGPOSVARDEC || p.mObjType == CH_NEGNEGVARDEC);
				initVarint(p, p.mObjType, S_VARDEC2);
				continue;
			case S_VARDEC2:
				var m1 = getVarIntVal(p, p.mObjType == CH_POSNEGVARDEC || p.mObjType == CH_NEGNEGVARDEC);
				m1 = (typeof m1 == "number") ? bigIntFromNumber(m1) : m1;
				hitNext(p, new BigDec(m1, 0 - p.mDecExp));
				p.mState = S_NEXTOBJ;
				continue;

			case S_BIGDEC1:
				p.mDecExp = getVarint32(p, p.mObjType == CH_NEGPOSBIGDEC || p.mObjType == CH_NEGNEGBIGDEC);
				initBytes(p, p.mObjType, S_BIGDEC2);
				continue;
			case S_BIGDEC2:
				var m2 = bigIntFromBytes(p.mObjType == CH_POSNEGBIGDEC || p.mObjType == CH_NEGNEGBIGDEC, p.mBytes, 0, p.mBytesLen);
				hitNextAndReset(p, new BigDec(m2, 0 - p.mDecExp));
				continue;

			case S_BLOB:
				// TODO: if p.mBytes.length is large then the subarray will be larger than needed
				//   create smaller array and copy data to smaller array??
				//   create simple array if len is short (not buffer/uint8array)? what is the cutoff length?
				hitNext(p, p.mBytes.subarray(0, p.mBytesLen));
				// cannot reuse buffer! since it is returned to caller
				p.mBytes = EMPTYBUF;
				p.mState = S_NEXTOBJ;
				continue;
			case S_STR:
				hitNextAndReset(p, getstr(p.mBytes.subarray(0, p.mBytesLen)));
				continue;

			default:
				throwErr(p, "unknown state");
		}
	}
}

/**
 * @param {!PartialParser.Buff} b
 * @return {?Array}
 * @memberof PartialParser
 */
PartialParser.prototype.parseNext = function(b) {
	return parseNext(this, b);
};

}());

/**
 * @constructor
 * @memberof PartialParser
 */
PartialParser.Buff = function() {
	/** @type {?Uint8Array} */
	this.data = null;
	/** @type {number} */
	this.idx = 0;
	/** @type {number} */
	this.len = 0;
};

