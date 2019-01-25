// Dependencies: BigInteger, BigDec, OpaDef, NEWBUF, STRDEC

/**
 * @constructor
 */
var PartialParser = function(){};

(function(){

const S_NEXTOBJ = 1;
const S_VARINT1 = 2;
const S_VARINT2 = 3;
const S_VARDEC1 = 4;
const S_VARDEC2 = 5;
const S_BIGINT  = 6;
const S_BIGDEC1 = 7;
const S_BIGDEC2 = 8;
const S_BYTES1  = 9;
const S_BYTES2  = 10;
const S_BLOB    = 11;
const S_STR     = 12;
const S_ERR     = 13;

// note: this temp variable is only used to read varints so it will never store more than a 64 bit integer (low memory)
const TMPBI1 = new BigInteger(null);

/**
 * @constructor
 */
PartialParser = function() {
	/** @type {!Array<*>} */
	this.mContainers = [];
	/** @type {Array} */
	this.mCurrCont = null;
	/** @type {number} */
	this.mState = S_NEXTOBJ;
	/** @type {number} */
	this.mNextState = 0;
	/** @type {number} */
	this.mNextState2 = 0;
	/** @type {!BigInteger|number} */
	this.mVarintVal = 0;
	/** @type {number} */
	this.mVarintMul = 0;
	/** @type {number} */
	this.mVarintBitshift = 0;
	/** @type {number} */
	this.mDecExp = 0;
	/** @type {number} */
	this.mObjType = 0;
	/** @type {number} */
	this.mBytesIdx = 0;
	/** @type {number} */
	this.mBytesLen = 0;
	/** @type {Uint8Array} */
	this.mBytes = null;
}

/**
 * @param {!PartialParser} p
 * @param {!string} msg
 */
function throwErr(p, msg) {
	p.mState = S_ERR;
	throw msg;
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
 * @param {number} objType
 * @param {number} nextState
 */
function initVarint(p, objType, nextState) {
	p.mState = S_VARINT1;
	p.mNextState = nextState;
	p.mObjType = objType;
	p.mVarintVal = 0;
	p.mVarintMul = 1;
	p.mVarintBitshift = 0;
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
	if (typeof p.mVarintVal != "number" || p.mVarintVal > 2147483647) {
		throwErr(p, "varint out of range");
	}
	return neg ? 0 - /** @type {number} */ (p.mVarintVal) : /** @type {number} */ (p.mVarintVal);
}

/**
 * @param {boolean} neg
 * @param {number|!BigInteger} v
 * @return {number|!BigInteger}
 */
function getNum(neg, v) {
	if (neg) {
		if (typeof v == "number") {
			return 0 - v;
		} else {
			BigInteger.ZERO.subTo(v, v);
		}
	}
	return v;
}

/**
 * read a byte array in big-endian format that is always positive (does not have a sign bit)
 * custom function similar to bnpFromString(s,256);
 * see also, java constructor: public BigInteger(int signum, byte[] magnitude)
 *   https://docs.oracle.com/javase/7/docs/api/java/math/BigInteger.html#BigInteger(int,%20byte[])
 * @param {!Uint8Array} b
 * @param {number} len
 * @param {!BigInteger} r
 * @return {!BigInteger}
 */
function bigintFromBytes2(b, len, r) {
	r.t = 0;
	r.s = 0;
	var i = len;
	var sh = 0;
	while (--i >= 0) {
		var x = b[i] & 0xff;
		if (sh == 0) {
			r[r.t++] = x;
		} else if (sh + 8 > r.DB) {
			r[r.t - 1] |= (x & ((1 << (r.DB - sh)) - 1)) << sh;
			r[r.t++] = (x >> (r.DB - sh));
		} else {
			r[r.t - 1] |= x << sh;
		}
		sh += 8;
		if (sh >= r.DB) {
			sh -= r.DB;
		}
	}
	r.clamp();
	return r;
}

/**
 * @param {boolean} neg
 * @param {!BigInteger} v
 */
function getBI(neg, v) {
	if (neg) {
		BigInteger.ZERO.subTo(v, v);
	}
	return v;
}

/**
 * @param {!PartialParser} p
 * @param {boolean} neg
 * @return {!BigInteger}
 */
function bigIntFromBytes(p, neg) {
	//var b = p.mBytes.subarray(0, p.mBytesLen);
	return getBI(neg, bigintFromBytes2(p.mBytes, p.mBytesLen, new BigInteger(null)));
}

/**
 * @param {number} n
 * @return {!BigInteger}
 */
function bigIntFromNumber(n) {
	if (n < 0) {
		return getBI(true, bigIntFromNumber(0 - n));
	}
	if (n == 0) {
		return BigInteger.ZERO.clone();
	}
	if (!Number.isSafeInteger(n)) {
		throw "arg is not safe integer";
	}

	//return new BigInteger(n.toString(16), 16);

	var val = new BigInteger(null);
	val.s = 0;
	val.t = 1;
	val[0] = n & val.DM;
	n = Math.floor(n/val.DV);
	for (var i = 1; n > 0; ++i) {
		val[i] = n & val.DM;
		++val.t;
		n = Math.floor(n/val.DV);
	}
	return val;
}

/**
 * @param {!PartialParser} p
 * @param {number} bval
 */
function varintNextByte(p, bval) {
	if (p.mVarintBitshift < 28) {
		p.mVarintVal |= (bval & 0x7F) << p.mVarintBitshift;
		p.mVarintMul <<= 7;
	} else if (p.mVarintBitshift < 49) {
		// can read 7 bytes before having to switch to BigInteger
		// must use addition/multiplication (cannot use bit ops on big numbers)
		// see https://stackoverflow.com/questions/307179/what-is-javascripts-highest-integer-value-that-a-number-can-go-to-without-losin
		p.mVarintVal += (bval & 0x7F) * p.mVarintMul;
		p.mVarintMul *= 128;
	} else if (p.mVarintBitshift > 56) {
		throw "varint too big";
	} else {
		if (p.mVarintBitshift == 49) {
			// mVarintVal is a number; must convert to a BigInteger
			p.mVarintVal = bigIntFromNumber(/** @type {number} */ (p.mVarintVal));
		}
		TMPBI1.fromInt(bval & 0x7F);
		TMPBI1.lShiftTo(p.mVarintBitshift, TMPBI1);
		p.mVarintVal.addTo(TMPBI1, /** @type {!BigInteger} */ (p.mVarintVal));
	}
	p.mVarintBitshift += 7;
}

/**
 * @param {!PartialParser} p
 * @param {!Uint8Array} b
 * @return {!string}
 */
function getstr(p, b) {
	var str = PartialParser.BUF2STR ? PartialParser.BUF2STR.get(b) : null;
	return str ? str : STRDEC(b);
}

/**
 * @param {!PartialParser} p
 */
function clearBytes(p) {
	if (p.mBytes.length > 4096) {
		p.mBytes = null;
	}
}

/**
 * @param {!PartialParser.Buff} b
 * @return {Array}
 * @memberof PartialParser
 */
PartialParser.prototype.parseNext = function(b) {
	var p = this;
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
					case OpaDef.UNDEFINED:  hitNext(p, undefined); continue;
					case OpaDef.NULL:       hitNext(p, null);      continue;
					case OpaDef.FALSE:      hitNext(p, false);     continue;
					case OpaDef.TRUE:       hitNext(p, true);      continue;
					case OpaDef.ZERO:       hitNext(p, 0);         continue;
					case OpaDef.EMPTYBIN:   hitNext(p, NEWBUF(0)); continue;
					case OpaDef.EMPTYSTR:   hitNext(p, "");        continue;
					case OpaDef.EMPTYARRAY: hitNext(p, []);        continue;
					case OpaDef.SORTMAX:    hitNext(p, OpaDef.SORTMAX_OBJ); continue;

					case OpaDef.NEGVARINT: initVarint(p, OpaDef.NEGVARINT, S_VARINT2); continue;
					case OpaDef.POSVARINT: initVarint(p, OpaDef.POSVARINT, S_VARINT2); continue;

					case OpaDef.NEGBIGINT: initBytes(p, OpaDef.NEGBIGINT, S_BIGINT); continue;
					case OpaDef.POSBIGINT: initBytes(p, OpaDef.POSBIGINT, S_BIGINT); continue;

					case OpaDef.POSPOSVARDEC: initVarint(p, OpaDef.POSPOSVARDEC, S_VARDEC1); continue;
					case OpaDef.POSNEGVARDEC: initVarint(p, OpaDef.POSNEGVARDEC, S_VARDEC1); continue;
					case OpaDef.NEGPOSVARDEC: initVarint(p, OpaDef.NEGPOSVARDEC, S_VARDEC1); continue;
					case OpaDef.NEGNEGVARDEC: initVarint(p, OpaDef.NEGNEGVARDEC, S_VARDEC1); continue;

					case OpaDef.POSPOSBIGDEC: initVarint(p, OpaDef.POSPOSBIGDEC, S_BIGDEC1); continue;
					case OpaDef.POSNEGBIGDEC: initVarint(p, OpaDef.POSNEGBIGDEC, S_BIGDEC1); continue;
					case OpaDef.NEGPOSBIGDEC: initVarint(p, OpaDef.NEGPOSBIGDEC, S_BIGDEC1); continue;
					case OpaDef.NEGNEGBIGDEC: initVarint(p, OpaDef.NEGNEGBIGDEC, S_BIGDEC1); continue;

					case OpaDef.BINLPVI: initBytes(p, OpaDef.BINLPVI, S_BLOB); continue;
					case OpaDef.STRLPVI: initBytes(p, OpaDef.STRLPVI, S_STR ); continue;

					case OpaDef.ARRAYSTART:
						if (p.mCurrCont != null) {
							p.mContainers.push(p.mCurrCont);
						}
						p.mCurrCont = [];
						continue;
					case OpaDef.ARRAYEND:
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
				}

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
				hitNext(p, getNum(p.mObjType == OpaDef.NEGVARINT, p.mVarintVal));
				p.mState = S_NEXTOBJ;
				continue;
			case S_BYTES1:
				p.mBytesLen = getVarint32(p, false);
				if (p.mBytes == null || p.mBytes.length < p.mBytesLen) {
					p.mBytes = NEWBUF(p.mBytesLen);
				}
				p.mBytesIdx = 0;
				p.mState = S_BYTES2;
				// fall-thru to next state
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
				hitNext(p, bigIntFromBytes(p, p.mObjType == OpaDef.NEGBIGINT));
				//p.mBytes = null;
				clearBytes(p);
				p.mState = S_NEXTOBJ;
				continue;

			case S_VARDEC1:
				p.mDecExp = getVarint32(p, p.mObjType == OpaDef.NEGPOSVARDEC || p.mObjType == OpaDef.NEGNEGVARDEC);
				initVarint(p, p.mObjType, S_VARDEC2);
				continue;
			case S_VARDEC2:
				var m = getNum(p.mObjType == OpaDef.POSNEGVARDEC || p.mObjType == OpaDef.NEGNEGVARDEC, p.mVarintVal);
				m = (typeof m == "number") ? bigIntFromNumber(m) : m;
				hitNext(p, new BigDec(m, p.mDecExp));
				p.mState = S_NEXTOBJ;
				continue;

			case S_BIGDEC1:
				p.mDecExp = getVarint32(p, p.mObjType == OpaDef.NEGPOSBIGDEC || p.mObjType == OpaDef.NEGNEGBIGDEC);
				initBytes(p, p.mObjType, S_BIGDEC2);
				continue;
			case S_BIGDEC2:
				var m = bigIntFromBytes(p, p.mObjType == OpaDef.POSNEGBIGDEC || p.mObjType == OpaDef.NEGNEGBIGDEC);
				hitNext(p, new BigDec(m, p.mDecExp));
				//p.mBytes = null;
				clearBytes(p);
				p.mState = S_NEXTOBJ;
				continue;

			case S_BLOB:
				// TODO: if p.mBytes.length is large then the subarray will be larger than needed
				//   create smaller array and copy data to smaller array??
				//   create simple array if len is short (not buffer/uint8array)? what is the cutoff length?
				hitNext(p, p.mBytes.subarray(0, p.mBytesLen));
				// cannot reuse buffer! since it is returned to caller
				p.mBytes = null;
				p.mState = S_NEXTOBJ;
				continue;
			case S_STR:
				hitNext(p, getstr(p, p.mBytes.subarray(0, p.mBytesLen)));
				//p.mBytes = null;
				clearBytes(p);
				p.mState = S_NEXTOBJ;
				continue;

			default:
				throwErr(p, "unknown state");
		}
	}
}

/**
 * maps {utf-8 bytes -> strings} to avoid conversion (speed up) and improve
 * memory usage (prevent duplicate copies of same string)
 * @type {Map<!Uint8Array, !string>}
 * @const
 * @memberof PartialParser
 */
PartialParser.BUF2STR = (typeof Map == "undefined") ? null : new Map();

}());

/**
 * @constructor
 * @memberof PartialParser
 */
PartialParser.Buff = function() {
	/** @type {Uint8Array} */
	this.data = null;
	/** @type {number} */
	this.idx = 0;
	/** @type {number} */
	this.len = 0;
};

