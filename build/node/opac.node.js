"use strict";

var BigInteger = require("jsbn").BigInteger;

var NEWBUF = function(l) {
	// TODO: ok to use unsafe here?
	return Buffer.allocUnsafe(l);
}
var STRENC = function(s) {
	return Buffer.from(s, "utf-8");
}
var STRDEC = function(b) {
	return b.toString("utf-8");
}
var BTOA = function(v) {
	return Buffer.from(v).toString("base64");
}

var VERSION = "0.1.29";


/**
 * @classdesc This class is not actually created. It is here to help with type checking.
 * @constructor
 * @extends Array
 * @hideconstructor
 */
function QChunk() {}
/** @type {QChunk} */
QChunk.prototype.next;
/** @type {number} */
QChunk.prototype.head;
/** @type {number} */
QChunk.prototype.used;

/**
 * Queue that allocates arrays in small chunks as needed. Chunks are stored as linked list.
 * This design is efficient because it does not require growing arrays and copying data when
 * capacity is exceeded. Also, large contiguous chunks of memory are not required.
 * If only 1 chunk is needed, then it is utilized as a circular array to avoid constantly
 * reallocating a new chunk.
 * @constructor
 * @template T
 */
function Queue() {
	/** @type {number} */
	this.totlen = 0;
	/** @type {!QChunk} */
	this.head = newQChunk(this.newChunkSize, null);
	/** @type {!QChunk} */
	this.tail = this.head;
}

/**
 * @ignore
 * @param {number} size - size of chunk's array
 * @param {QChunk} prev - link to previous chunk
 * @return {!QChunk}
 */
function newQChunk(size, prev) {
	var c = /** @type {!QChunk} */ (new Array(size));
	c.next = null;
	c.head = 0;
	c.used = 0;
	if (prev) {
		prev.next = c;
	}
	return c;
}

/**
 * Add the specified element to the tail of the queue
 * @param {T} item
 * @return {number} new length after adding item
 */
Queue.prototype.push = function(item) {
	var chunk = this.tail;
	if (chunk.used + 1 >= chunk.length) {
		this.tail = chunk = newQChunk(this.newChunkSize, chunk);
	}
	chunk[(chunk.head + chunk.used) & (chunk.length - 1)] = item;
	chunk.used++;
	return ++this.totlen;
};

/**
 * Remove an item from the head of the queue
 * @return {T} The first item in the queue or undefined if queue is empty
 */
Queue.prototype.shift = function() {
	var chunk = this.head;
	if (chunk.used == 0) {
		return undefined;
	}
	var idx = chunk.head;
	var item = chunk[idx];
	chunk[idx] = undefined;
	chunk.used--;
	if (chunk.used == 0 && chunk.next) {
		this.head = chunk.next;
	} else {
		chunk.head = (idx + 1) & (chunk.length - 1);
	}
	this.totlen--;
	return item;
};

/**
 * @return {number}
 */
Queue.prototype.size = function() {
	return this.totlen;
};

/**
 * size of each new array chunk. must be greater than 0 and a power of 2!
 * @type {number}
 */
Queue.prototype.newChunkSize = 64;

// dependencies: BigInteger

/*
TODO:
 add mathcontext to each op to handle rounding
 divide()
 remainder()
 pow()
 stripTrailingZeros()
 scale()
*/

/**
 * @constructor
 * @param {BigInteger|string} man
 * @param {number=} exp
 */
function BigDec(man, exp) {
	/**
	 * @ignore
	 * @param {!BigDec} v
	 * @param {!string} s
	 */
	function bdFromString(v, s) {
		var decPos = s.indexOf(".");
		var epos = s.indexOf("e");
		if (epos < 0) {
			epos = s.indexOf("E");
		}
		if (epos < 0) {
			v.m = new BigInteger(s);
			v.e = 0;
		} else {
			v.m = new BigInteger(s.substring(0, epos));
			v.e = parseInt(s.substr(epos + 1), 10);
			if (!isSafeInteger(v.e)) {
				throw 'number string "' + s + '" cannot be parsed';
			}
		}
		if (decPos >= 0) {
			v.e -= epos < 0 ? s.length - decPos - 1 : epos - decPos - 1;
		}
	}

	if (typeof man == "string") {
		bdFromString(this, man);
	} else {
		/** @type {!BigInteger} */
		this.m = man ? man : new BigInteger(null);
		/** @type {number} */
		this.e = exp ? exp : 0;
	}
}

(function(){

/**
 * @return {!BigDec}
 */
function nbd() { return new BigDec(new BigInteger(null), 0); }

/**
 * @param {!BigDec} a
 * @param {number} amount
 * @return {!BigDec}
 */
function extend(a, amount) {
	if (amount < 0) {
		throw "invalid extension. must be >= 0";
	} else if (amount == 0) {
		return a;
	}
	// dMultiply() requires a number >= 0. must negate if negative; otherwise clone (since value will be modified)
	var m = a.m.signum() < 0 ? a.m.negate() : a.m.clone();
	for (var i = amount; i > 0; --i) {
		m.dMultiply(10);
	}
	return new BigDec(a.m.signum() < 0 ? m.negate() : m, a.e - amount);
}

/**
 * r = a + b
 * @param {!BigDec} a
 * @param {!BigDec} b
 * @param {!BigDec} r
 */
function add3(a, b, r) {
	if (b.signum() == 0) {
		a.copyTo(r);
	} else if (a.signum() == 0) {
		b.copyTo(r);
	} else {
		if (a.e > b.e) {
			a = extend(a, a.e - b.e);
		} else if (a.e < b.e) {
			b = extend(b, b.e - a.e);
		}
		a.m.addTo(b.m, r.m);
		r.e = r.m.signum() == 0 ? 0 : a.e;
	}
}

/**
 * r = a - b
 * @param {!BigDec} a
 * @param {!BigDec} b
 * @param {!BigDec} r
 */
function sub3(a, b, r) {
	if (b.signum() == 0) {
		a.copyTo(r);
	} else if (a.signum() == 0) {
		BigInteger.ZERO.subTo(b.m, r.m);
		r.e = b.e;
	} else {
		if (a.e > b.e) {
			a = extend(a, a.e - b.e);
		} else if (a.e < b.e) {
			b = extend(b, b.e - a.e);
		}
		a.m.subTo(b.m, r.m);
		r.e = r.m.signum() == 0 ? 0 : a.e;
	}
}

/**
 * r = a * b
 * @param {!BigDec} a
 * @param {!BigDec} b
 * @param {!BigDec} r
 */
function mul3(a, b, r) {
	if (a == r || b == r) {
		// multiplyTo() docs say that result cannot be same object as a or b
		var tmp = r.clone();
		mul3(a, b, tmp);
		tmp.copyTo(r);
	} else if (a.signum() == 0) {
		a.copyTo(r);
	} else if (b.signum() == 0) {
		b.copyTo(r);
	} else {
		if (a.e > b.e) {
			a = extend(a, a.e - b.e);
		} else if (a.e < b.e) {
			b = extend(b, b.e - a.e);
		}

		a.m.multiplyTo(b.m, r.m);
		r.e = r.m.signum() == 0 ? 0 : a.e + b.e;
	}
}

/**
 * q = a / b
 * r = a % b
 * q or r may be null
 * @param {!BigDec} a
 * @param {!BigDec} b
 * @param {BigDec} q
 * @param {BigDec} r
 */
function div(a, b, q, r) {
	if (a == r || b == r) {
		var tmp = r.clone();
		div(a, b, q, tmp);
		tmp.copyTo(r);
	} else if (a == q || b == q) {
		var tmp = q.clone();
		div(a, b, tmp, r);
		tmp.copyTo(q);
	} else if (b.signum() == 0) {
		// TODO: use NaN?
		// actually, can probably define x/0 to be 0. see https://www.hillelwayne.com/post/divide-by-zero/
		throw "cannot divide by 0";
	} else if (a.signum() == 0) {
		if (q) {
			a.copyTo(q);
		}
		if (r) {
			a.copyTo(r);
		}
	} else {
		if (a.e > b.e) {
			a = extend(a, a.e - b.e);
		} else if (a.e < b.e) {
			b = extend(b, b.e - a.e);
		}

		// TODO: is this correct?
		a.m.divRemTo(b.m, q ? q.m : null, r ? r.m : null);
		if (q) {
			q.e = 0;
		}
		if (r) {
			r.e = 0;
		}
	}
}

/**
 * @return {!BigDec}
 */
BigDec.prototype.abs = function() {
	return this.m.signum() < 0 ? new BigDec(this.m.abs(), this.e) : this;
}

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
BigDec.prototype.add = function(b) {
	var r = nbd();
	add3(this, b, r);
	return r;
}

/**
 * @return {!BigDec}
 */
BigDec.prototype.clone = function() {
	return new BigDec(this.m.clone(), this.e);
}

/**
 * @param {!BigDec} b
 * @return {number}
 */
BigDec.prototype.compareTo = function(b) {
	if (this.m.s < 0) {
		if (b.m.s >= 0) {
			return -1;
		}
	} else if (b.m.s < 0) {
		return 1;
	}

	// TODO: if exp's are not equal, can estimate comparison based on number of bits
	//  each power of ten is worth which could prevent having to multiply and extend
	//  a value until exponents are equal
	if (this.e == b.e) {
		return this.m.compareTo(b.m);
	} else if (this.e > b.e) {
		return extend(this, this.e - b.e).compareTo(b);
	} else {
		return this.compareTo(extend(b, b.e - this.e));
	}
}

/**
 * @param {!BigDec} r
 */
BigDec.prototype.copyTo = function(r) {
	this.m.copyTo(r.m);
	r.e = this.e;
}

/*
BigDec.prototype.divideAndRemainder = function(b) {
	var q = nbd();
	var r = nbd();
	div(this, b, q, r);
	return [q, r];
}

BigDec.prototype.equals = function(b) {
	return this.compareTo(b) == 0;
}

BigDec.prototype.max = function(b) {
	return this.compareTo(b) > 0 ? this : b;
}

BigDec.prototype.min = function(b) {
	return this.compareTo(b) < 0 ? this : b;
}
*/

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
BigDec.prototype.multiply = function(b) {
	var r = nbd();
	mul3(this, b, r);
	return r;
}

/**
 * Returns -1 if this value is negative, 1 if positive, else 0 (if this is equal to zero).
 * @return {number}
 */
BigDec.prototype.signum = function() {
	return this.m.signum();
}

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
BigDec.prototype.subtract = function(b) {
	var r = nbd();
	sub3(this, b, r);
	return r;
}

/**
 * @return {!string}
 */
BigDec.prototype.toString = function() {
	// TODO: return same string that java returns
	var s = this.m.toString();
	if (this.e != 0) {
		s += "e" + this.e.toString();
	}
	return s;
}

}());


/**
 * @constructor
 * @ignore
 */
function OpaSortMax() {
	this.toString = function(){return "SORTMAX";}
}

/**
 * @class OpaDef
 * @hideconstructor
 */
var OpaDef = {};

(function(){

/**
 * @param {!string} s
 * @return {number}
 */
function CC(s) {
	return s.charCodeAt(0);
}

/** @const {number} */
OpaDef.UNDEFINED    = CC("U");
/** @const {number} */
OpaDef.NULL         = CC("N");
/** @const {number} */
OpaDef.FALSE        = CC("F");
/** @const {number} */
OpaDef.TRUE         = CC("T");
/** @const {number} */
OpaDef.ZERO         = CC("O");
/** @const {number} */
OpaDef.EMPTYBIN     = CC("A");
/** @const {number} */
OpaDef.EMPTYSTR     = CC("R");
/** @const {number} */
OpaDef.EMPTYARRAY   = CC("M");
/** @const {number} */
OpaDef.SORTMAX      = CC("Z");

/** @const {number} */
OpaDef.POSVARINT    = CC("D");
/** @const {number} */
OpaDef.NEGVARINT    = CC("E");
/** @const {number} */
OpaDef.POSPOSVARDEC = CC("G");
/** @const {number} */
OpaDef.POSNEGVARDEC = CC("H");
/** @const {number} */
OpaDef.NEGPOSVARDEC = CC("I");
/** @const {number} */
OpaDef.NEGNEGVARDEC = CC("J");
/** @const {number} */
OpaDef.POSBIGINT    = CC("K");
/** @const {number} */
OpaDef.NEGBIGINT    = CC("L");
/** @const {number} */
OpaDef.POSPOSBIGDEC = CC("V");
/** @const {number} */
OpaDef.POSNEGBIGDEC = CC("W");
/** @const {number} */
OpaDef.NEGPOSBIGDEC = CC("X");
/** @const {number} */
OpaDef.NEGNEGBIGDEC = CC("Y");

/** @const {number} */
OpaDef.BINLPVI      = CC("B");
/** @const {number} */
OpaDef.STRLPVI      = CC("S");

/** @const {number} */
OpaDef.ARRAYSTART   = CC("[");
/** @const {number} */
OpaDef.ARRAYEND     = CC("]");

/** @const {!OpaSortMax} */
OpaDef.SORTMAX_OBJ = new OpaSortMax();

/** @const {number} */
OpaDef.ERR_CLOSED = -16394;

}());


// Dependencies: BigInteger, BigDec, OpaDef, NEWBUF, STRDEC

/**
 * @constructor
 */
var PartialParser = function(){};

(function(){

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

// note: this temp variable is only used to read varints so it will never store more than a 64 bit integer (low memory)
var TMPBI1 = new BigInteger(null);

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
 * @return {!BigInteger}
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
	return getBI(neg, bigintFromBytes2(/** @type {!Uint8Array} */ (p.mBytes), p.mBytesLen, new BigInteger(null)));
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
	if (!isSafeInteger(n)) {
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

// Dependencies: BigInteger, BigDec, OpaDef, NEWBUF, STRENC

/**
 * @interface
 */
var IWriter = function() {};

/**
 * @param {!Uint8Array} buff
 */
IWriter.prototype.write = function(buff) {};

IWriter.prototype.flush = function() {};


/**
 * @constructor
 * @param {!IWriter} out - Where to write values
 * @param {number=} sz - Length of internal buffer
 */
function Serializer(out, sz) {
	if (sz && sz <= 10) {
		throw "buffer len is too small";
	}
	/** @type {!IWriter} */
	this.o = out;
	/** @type {!Uint8Array} */
	this.b = NEWBUF(sz ? sz : 4096);
	/** @type {number} */
	this.i = 0;
}

(function(){

var SURROGATE_OFFSET = 0x010000 - (0xD800 << 10) - 0xDC00;
var BIMAXVARINT = new BigInteger("9223372036854775807");
var BIMINVARINT = BIMAXVARINT.negate();
var BIGINT31 = new BigInteger("7FFFFFFF", 16);

// note: potential memory leak here. keeping a temp big int object for serialization, to prevent allocations
//  it does not get cleared after use. assume memory usage will not be very large for 1 value
var TMPBI2 = new BigInteger(null);

/**
 * @param {!string} s
 * @param {number} offset
 * @param {number} len
 * @return {number}
 */
function getUtf8Len(s, offset, len) {
	var end = offset + len;
	var numBytes = len;
	for (var i = offset; i < end; ++i) {
		var ch = s.charCodeAt(i);
		if (ch < 0x80) {
		} else if (ch < 0x800) {
			++numBytes;
		} else if (ch < 0xD800 || ch > 0xDFFF) {
			numBytes += 2;
		} else {
			// surrogate pair
			// confirm valid high surrogate
			if (ch < 0xDC00 && (i < end - 1)) {
				var ch2 = s.charCodeAt(i + 1);
				// confirm valid low surrogate
				if (ch2 >= 0xDC00 && ch2 <= 0xDFFF) {
					numBytes += 3;
					++i;
					continue;
				}
			}
			// invalid surrogate pair; will use 3 byte replacement when writing utf-8 bytes
			numBytes += 2;
		}
	}
	return numBytes;
}

/**
 * @param {!Serializer} ser
 * @param {!string} str
 */
function writeUtf8(ser, str) {
	var end = str.length;
	//var blen = buff.length;
	var bpos = ser.i;
	var buff = ser.b;
	for (var i = 0; i < end; ++i) {
		if (bpos + 4 > buff.length) {
			flushBuff(ser);
			bpos = 0;
			buff = ser.b;
		}
		var ch = str.charCodeAt(i);
		if (ch < 0x80) {
			buff[bpos++] = ch;
		} else if (ch < 0x800) {
			buff[bpos++] = 0xC0 | (ch >> 6);
			buff[bpos++] = 0x80 | (ch & 0x3F);
		} else if (ch < 0xD800 || ch > 0xDFFF) {
			buff[bpos++] = 0xE0 | (ch >> 12);
			buff[bpos++] = 0x80 | ((ch >> 6) & 0x3F);
			buff[bpos++] = 0x80 | (ch & 0x3F);
		} else {
			// surrogate pair
			// confirm valid high surrogate
			if (ch < 0xDC00 && (i < end - 1)) {
				var ch2 = str.charCodeAt(i + 1);
				// confirm valid low surrogate and write pair
				if (ch2 >= 0xDC00 && ch2 <= 0xDFFF) {
					ch2 = (ch << 10) + ch2 + SURROGATE_OFFSET;
					++i;
					buff[bpos++] = 0xF0 | (ch2 >> 18);
					buff[bpos++] = 0x80 | ((ch2 >> 12) & 0x3F);
					buff[bpos++] = 0x80 | ((ch2 >> 6) & 0x3F);
					buff[bpos++] = 0x80 | (ch2 & 0x3F);
					continue;
				}
			}
			// replace unpaired surrogate or out-of-order low surrogate with substitution character
			buff[bpos++] = 0xEF;
			buff[bpos++] = 0xBF;
			buff[bpos++] = 0xBD;
		}
	}
	//return bpos;
	ser.i = bpos;
}

/**
 * @param {!Serializer} s
 */
function flushBuff(s) {
	if (s.i > 0) {
		s.o.write(s.i == s.b.length ? s.b : s.b.subarray(0, s.i));
		s.i = 0;
	}
}

/**
 * @param {!Serializer} s
 * @param {number} l
 */
function ensureSpace(s, l) {
	if (s.i + l > s.b.length) {
		flushBuff(s);
	}
}

/**
 * @param {!Serializer} s
 * @param {number} t
 * @param {number} v
 */
function writeTypeAndVarint(s, t, v) {
	ensureSpace(s, 10);
	if (t != 0) {
		s.b[s.i++] = t;
	}
	while (v > 0x7FFFFFFF) {
		// numbers greater than 31 bits need to use math ops. cannot use bit ops
		s.b[s.i++] = 0x80 | (v % 128);
		v = Math.floor(v/128);
	}
	while (v > 0x7F) {
		s.b[s.i++] = 0x80 | (v & 0xFF);
		v >>>= 7;
	}
	s.b[s.i++] = v;
}

/**
 * @param {!Serializer} s
 * @param {number} t
 * @param {!BigInteger} v
 */
function writeTypeAndBigBytes(s, t, v) {
	if (v.signum() < 0) {
		BigInteger.ZERO.subTo(v, TMPBI2);
		writeTypeAndBigBytes(s, t, TMPBI2);
		return;
	}
	var bitLen = v.bitLength();
	var numBytes = (bitLen >> 3) + ((bitLen & 0x7) == 0 ? 0 : 1);
	// TODO: implement a function that doesn't require memory allocation
	var buff = v.toByteArray();
	if (!(buff.length == numBytes || buff.length == numBytes + 1)) {
		throw "BigInteger.toByteArray() returned unexpected value";
	}
	writeTypeAndVarint(s, t, numBytes);
	for (var i = buff.length - numBytes; i < buff.length; ++i) {
		s.write1(buff[i]);
	}
}

/**
 * @param {!Serializer} s
 * @param {number} t
 * @param {!BigInteger} v
 */
function writeBIAsVI(s, t, v) {
	if (v.signum() < 0) {
		BigInteger.ZERO.subTo(v, TMPBI2);
		writeBIAsVI(s, t, TMPBI2);
		return;
	}

	ensureSpace(s, 10);
	if (t != 0) {
		s.b[s.i++] = t;
	}

	if (v.compareTo(BIGINT31) > 0) {
		if (v != TMPBI2) {
			v.copyTo(TMPBI2);
			v = TMPBI2;
		}
		while (v.compareTo(BIGINT31) > 0) {
			s.b[s.i++] = 0x80 | (v.byteValue() & 0x7F);
			v.rShiftTo(7, v);
		}
	}

	var intv = v.intValue();
	while (intv > 0x7F) {
		s.b[s.i++] = 0x80 | (intv & 0xFF);
		intv >>>= 7;
	}
	s.b[s.i++] = intv;
}

/**
 * @param {!Serializer} s
 * @param {!BigInteger} v
 */
function writeBigInt(s, v) {
	var sn = v.signum();
	if (sn == 0) {
		s.write1(OpaDef.ZERO);
	} else if (sn > 0) {
		if (v.compareTo(BIMAXVARINT) <= 0) {
			writeBIAsVI(s, OpaDef.POSVARINT, v);
		} else {
			writeTypeAndBigBytes(s, OpaDef.POSBIGINT, v);
		}
	} else {
		if (v.compareTo(BIMINVARINT) >= 0) {
			writeBIAsVI(s, OpaDef.NEGVARINT, v);
		} else {
			writeTypeAndBigBytes(s, OpaDef.NEGBIGINT, v);
		}
	}
}

/**
 * @param {!Serializer} s
 * @param {!BigDec} v
 */
function writeBigDec(s, v) {
	if (v.e == 0) {
		writeBigInt(s, v.m);
	} else {
		var negExp = v.e < 0 ? true : false;
		var scale = v.e < 0 ? 0 - v.e : v.e;
		if (v.signum() > 0) {
			if (v.m.compareTo(BIMAXVARINT) <= 0) {
				writeTypeAndVarint(s, negExp ? OpaDef.NEGPOSVARDEC : OpaDef.POSPOSVARDEC, scale);
				writeBIAsVI(s, 0, v.m);
			} else {
				writeTypeAndVarint(s, negExp ? OpaDef.NEGPOSBIGDEC : OpaDef.POSPOSBIGDEC, scale);
				writeTypeAndBigBytes(s, 0, v.m);
			}
		} else {
			if (v.m.compareTo(BIMINVARINT) >= 0) {
				writeTypeAndVarint(s, negExp ? OpaDef.NEGNEGVARDEC : OpaDef.POSNEGVARDEC, scale);
				writeBIAsVI(s, 0, v.m);
			} else {
				writeTypeAndVarint(s, negExp ? OpaDef.NEGNEGBIGDEC : OpaDef.POSNEGBIGDEC, scale);
				writeTypeAndBigBytes(s, 0, v.m);
			}
		}
	}
}

/**
 * Write a single byte
 * @param {!number} v
 */
Serializer.prototype.write1 = function(v) {
	if (this.i >= this.b.length) {
		flushBuff(this);
	}
	this.b[this.i++] = v;
}

/**
 * Write a raw byte array
 * @param {!Uint8Array} b
 */
Serializer.prototype.write = function(b) {
	if (b.length > this.b.length - this.i) {
		flushBuff(this);
		if (b.length >= this.b.length) {
			this.o.write(b);
			return;
		}
	}
	this.b.set(b, this.i);
	this.i += b.length;
}

/**
 * Force any buffered bytes to be written
 */
Serializer.prototype.flush = function() {
	flushBuff(this);
	if (typeof this.o.flush === "function") {
		this.o.flush();
	}
}

/**
 * Serialize a number
 * @param {!number} v
 */
Serializer.prototype.writeNumber = function(v) {
	if (isSafeInteger(v)) {
		if (v > 0) {
			writeTypeAndVarint(this, OpaDef.POSVARINT, v);
		} else if (v == 0) {
			this.write1(OpaDef.ZERO);
		} else {
			writeTypeAndVarint(this, OpaDef.NEGVARINT, 0 - v);
		}
	} else {
		if (typeof v != "number") {
			throw "not a number";
		}
		if (isNaN(v) || !isFinite(v)) {
			throw "number is NaN or Infinity or -Infinity; cannot be serialized";
		}
		writeBigDec(this, new BigDec(v.toString()));
	}
}

/**
 * Serialize a string
 * @param {!string} v
 */
Serializer.prototype.writeString = function(v) {
	if (v.length == 0) {
		this.write1(OpaDef.EMPTYSTR);
		return;
	}
	var b;
	if (Serializer.STR2BUF) {
		b = Serializer.STR2BUF.get(v);
		if (b) {
			writeTypeAndVarint(this, OpaDef.STRLPVI, b.length);
			this.write(b);
			return;
		}
	}
	if (v.length < 1024) {
		// TODO: what is the proper cutoff string length to use the built-in encoder vs iterating over each char?
		writeTypeAndVarint(this, OpaDef.STRLPVI, getUtf8Len(v, 0, v.length));
		writeUtf8(this, v);
	} else {
		b = STRENC(v);
		writeTypeAndVarint(this, OpaDef.STRLPVI, b.length);
		this.write(b);
	}
}

/**
 * Serialize an Array
 * @param {!Array} v
 */
Serializer.prototype.writeArray = function(v) {
	if (v.length == 0) {
		this.write1(OpaDef.EMPTYARRAY);
	} else {
		this.write1(OpaDef.ARRAYSTART);
		for (var i = 0; i < v.length; ++i) {
			this.writeObject(v[i]);
		}
		this.write1(OpaDef.ARRAYEND);
	}
}

/**
 * Serialize any supported value (undefined/null/boolean/number/string/Uint8Array/BigInteger/BigDec/OpaDef.SORTMAX_OBJ)
 * or an Object with toOpaSO() property, or an Array containing any of the previously listed types.
 * @param {*} v
 */
Serializer.prototype.writeObject = function(v) {
	// TODO: handle iterable objects?
	//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
	switch (typeof v) {
		case "string":
			this.writeString(v);
			break;
		case "number":
			this.writeNumber(v);
			break;
		case "bigint":
			// note: this is here to attempt initial support for native bigint. It has not been tested.
			// TODO: test this! Chrome v67 and later should support bigints. Eventually more browsers will add support
			// TODO: this will be slow. add code to avoid conversion
			writeBigInt(this, new BigInteger(v.toString()));
			break;
		case "boolean":
			this.write1(v ? OpaDef.TRUE : OpaDef.FALSE);
			break;
		case "undefined":
			this.write1(OpaDef.UNDEFINED);
			break;
		case "object":
			v = /** @type {Object} */ (v);
			if (v === null) {
				this.write1(OpaDef.NULL);
			} else if (v.hasOwnProperty("toOpaSO") && typeof v.toOpaSO == "function") {
				v.toOpaSO(this);
			} else if (Array.isArray(v)) {
				this.writeArray(v);
			} else if (v === OpaDef.SORTMAX_OBJ) {
				this.write1(OpaDef.SORTMAX);
			} else if (v instanceof BigInteger) {
				writeBigInt(this, v);
			} else if (v instanceof BigDec) {
				writeBigDec(this, v);
			} else if (v.constructor.name == "Uint8Array" || v.constructor.name == "Buffer") {
				v = /** @type {!Uint8Array} */ (v);
				if (v.length == 0) {
					this.write1(OpaDef.EMPTYBIN);
				} else {
					writeTypeAndVarint(this, OpaDef.BINLPVI, v.length);
					this.write(v);
				}
			} else {
				throw "unsupported object type " + v.constructor.name;
			}
			break;
		default:
			throw "unsupported type " + typeof v;
	}
}

/**
 * maps {strings -> utf-8 bytes} to avoid conversion (speed up)
 * @type {Map<!string, !Uint8Array>}
 * @const
 * @memberof Serializer
 */
Serializer.STR2BUF = (typeof Map == "undefined") ? null : new Map();

}());


/**
 * @const
 * @ignore
 * @type {number}
 */
var MAX_SAFE_INTEGER =  9007199254740991;
/**
 * @const
 * @ignore
 * @type {number}
 */
var MIN_SAFE_INTEGER = 0 - MAX_SAFE_INTEGER;
/**
 * @const
 * @ignore
 * @type {function(number):boolean}
 */
var isInteger = Number.isInteger || function(v) {
	return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
};
/**
 * @const
 * @ignore
 * @type {function(number):boolean}
 */
var isSafeInteger = Number.isSafeInteger || function(v) {
	return isInteger(v) && v >= MIN_SAFE_INTEGER && v <= MAX_SAFE_INTEGER;
};

/**
 * @param {*} o
 * @return {!string}
 */
function opaType(o) {
	var t = typeof o;
	if (t == "object") {
		o = /** @type {Object} */ (o);
		if (o === null) {
			return "null";
		} else if (Array.isArray(o)) {
			return "Array";
		} else if (o === OpaDef.SORTMAX_OBJ) {
			return "SORTMAX";
		} else if (o instanceof BigInteger) {
			return "BigInteger";
		} else if (o instanceof BigDec) {
			return "BigDec";
		} else if (o.constructor.name == "Uint8Array") {
			return "Uint8Array";
		} else if (o.constructor.name == "Buffer") {
			return "Buffer";
		} else {
			return "object";
		}
		//throw "unknown object " + o.constructor.name + " " + o.toString();
	} else if (t == "string" || t == "number" || t == "boolean" || t == "undefined" || t == "bigint") {
		return t;
	}
	throw "unknown object";
}

/**
 * @alias stringify
 * @param {*} obj
 * @param {(number|string)=} space
 * @return {!string}
 */
function opaStringify(obj, space) {

	/**
	 * @param {number|string|undefined} space
	 * @param {number} depth
	 * @return {!string}
	 */
	function getindent(space, depth) {
		var indent = "";
		if (typeof space === "number") {
			for (var i = 0; i < space * depth ; ++i) {
				indent += " ";
			}
		} else if (typeof space === "string") {
			for (var i = 0; i <= depth; ++i) {
				indent += space;
			}
		}
		return indent;
	}

	/**
	 * @param {*} obj
	 * @param {number|string|undefined} space
	 * @param {number} depth
	 * @return {!string}
	 */
	function opaStringifyInternal(obj, space, depth) {
		switch (opaType(obj)) {
			case "undefined":
				return "undefined";
			case "null":
				return "null";
			//case "SORTMAX":
			//	return "SORTMAX";
			//case "boolean":
			//case "number":
			//case "BigInteger":
			//case "BigDec":
			//	return obj.toString();
			case "Uint8Array":
			case "Buffer":
				//var dv = new DataView(obj.buffer, obj.byteOffset, obj.byteLength);
		    	//for (var i = 0; i < obj.byteLength; ++i) {
				//	if (dv.getUint8(i) < 32 || dv.getUint8(i) > 126) {
				//	    //return '"~base64' + BTOA((new TextDecoder("utf-8")).decode(obj)) + '"';
				//	    return '"~base64' + BTOA(String.fromCharCode.apply(null, obj)) + '"';
				//	}
		    	//}
		    	//return JSON.stringify('~bin' + (new TextDecoder("utf-8")).decode(obj));
		    	return '"~base64' + BTOA(String.fromCharCode.apply(null, /** @type {Uint8Array} */ (obj))) + '"';
			case "string":
				obj = /** @type {!string} */ (obj);
				return JSON.stringify(obj.charAt(0) == "~" ? "~" + obj : obj);
			case "Array":
				obj = /** @type {!Array} */ (obj);
				if (obj.length == 0) {
					return "[]";
				}
				depth = depth ? depth : 0;
				var strs = [];
				for (var i = 0; i < obj.length; ++i) {
					strs[i] = opaStringifyInternal(obj[i], space, depth + 1);
				}
				if (!space) {
					return "[" + strs.join(",") + "]";
				}
				var indent1 = getindent(space, depth);
				var indent2 = getindent(space, depth + 1);
				return "[\n" + indent2 + strs.join(",\n" + indent2) + "\n" + indent1 + "]";
		}
		if (typeof obj.toString === "function") {
			return obj.toString();
		}
		throw "unhandled case in switch";
	}
	
	return opaStringifyInternal(obj, space, 0);
}

/**
 * Cache the utf-8 bytes for a string in memory. Improves performance slightly by
 * avoiding an allocation + conversion every time the string is serialized or parsed.
 * Use for strings that are repeated often.
 * @param {string} s - The string to cache
 */
function cacheString(s) {
	var b = STRENC(s);
	if (PartialParser.BUF2STR) {
		PartialParser.BUF2STR.set(b, s);
	}
	if (Serializer.STR2BUF) {
		Serializer.STR2BUF.set(s, b);
	}
}

// dependencies: STRENC PartialParser Serializer Queue Map

/**
 * @ignore
 * @typedef {function(*, *=):undefined}
 */
var ResponseCallback;

/**
 * @callback ResponseCallback
 * @param {*} result - The result of the operation. Can be null.
 * @param {*=} error - If response is an error then result is null and error is non-null
 */


/**
 * Create new EventClient
 * @constructor
 * @param {!IWriter} o - Object that has a write() and flush() method.
 */
function EventClient(o) {
	/** @type {!Serializer} */
	this.s = new Serializer(o);
	/** @type {number} */
	this.id = 0;
	/** @type {Queue<ResponseCallback>} */
	this.mMainCallbacks = new Queue();
	/** @type {!Map<*,!ResponseCallback>} */
	this.mAsyncCallbacks = new Map();
	/** @type {!PartialParser} */
	this.mParser = new PartialParser();
	/** @type {PartialParser.Buff} */
	this.mBuff = new PartialParser.Buff();
	/** @type {number|null} */
	this.mTimeout = null;
}

(function(){

/**
 * @param {EventClient} c
 */
function schedTimeout(c) {
	if (c.mTimeout === null) {
		// TODO: use process.nextTick() in node?
		c.mTimeout = setTimeout(function() {
			c.mTimeout = null;
			c.s.flush();
		}, 0);
	}
}

/**
 * @param {EventClient} c
 * @param {string} cmd
 */
function writeCommand(c, cmd) {
	// note: command cache was removed. STR2BUF (in Serializer) can be used instead
	c.s.writeString(cmd);
}

/**
 * @param {EventClient} c
 * @param {string} cmd
 * @param {Array=} args
 */
function callNoResponse(c, cmd, args) {
	// if no callback is specified then send null as async id indicating server must not send response
	c.s.write1(OpaDef.ARRAYSTART);
	writeCommand(c, cmd);
	c.s.writeObject(args ? args : null);
	c.s.write1(OpaDef.NULL);
	c.s.write1(OpaDef.ARRAYEND);
}

/**
 * Send all buffered requests.
 */
EventClient.prototype.flush = function() {
	if (this.mTimeout != null) {
		clearTimeout(this.mTimeout);
		this.mTimeout = null;
	}
	this.s.flush();
}

/**
 * Sends the specified command and args to the server. Invokes the specified callback when a response is received.
 * @param {string} cmd - The command to run
 * @param {Array=} args - The parameters for the command
 * @param {ResponseCallback=} cb - A callback function to invoke when the response is received
 */
EventClient.prototype.call = function(cmd, args, cb) {
	if (!cb) {
		return callNoResponse(this, cmd, args);
	}
	this.s.write1(OpaDef.ARRAYSTART);
	writeCommand(this, cmd);
	if (args) {
		this.s.writeObject(args);
	}
	this.s.write1(OpaDef.ARRAYEND);
	schedTimeout(this);
	this.mMainCallbacks.push(cb);
}

/**
 * @param {!EventClient} c
 * @param {string} cmd
 * @param {Array} args
 * @param {!ResponseCallback} cb
 * @param {number} isP
 * @return {number}
 */
function callId(c, cmd, args, cb, isP) {
	++c.id;
	var id = isP ? 0 - c.id : c.id;

	c.s.write1(OpaDef.ARRAYSTART);
	writeCommand(c, cmd);
	c.s.writeObject(args);
	c.s.writeNumber(id);
	c.s.write1(OpaDef.ARRAYEND);
	schedTimeout(c);
	c.mAsyncCallbacks.set(id, cb);
	return id;
}

/**
 * Sends the specified command and args to the server with an async id. Using an async id indicates to the
 * server that the operation response can be sent out of order. Invokes the specified callback when a
 * response is received.
 * @param {string} cmd - The command to run
 * @param {!Array} args - The parameters for the command
 * @param {!ResponseCallback} cb - A callback function to invoke when the response is received
 */
EventClient.prototype.callA = function(cmd, args, cb) {
	callId(this, cmd, args, cb, 0);
}

/**
 * Same as callA() except that the callback can be invoked multiple times. Use this for subscriptions.
 * @param {string} cmd - The command to run
 * @param {!Array} args - The parameters for the command
 * @param {!ResponseCallback} cb - A callback function to invoke when the responses are received
 * @return {*} - The value that is used when calling unregister()
 */
EventClient.prototype.callAP = function(cmd, args, cb) {
	return callId(this, cmd, args, cb, 1);
}

/**
 * Removes the specified async callback from the client. Use this when unsubscribing from a channel.
 * @param {*} id - The value that was returned from callAP()
 */
EventClient.prototype.unregister = function(id) {
	return this.mAsyncCallbacks.delete(id);
}

/**
 * @param {!EventClient} c
 * @param {!Array<*>} msg
 */
function onResponse(c, msg) {
	var cb;
	var id = msg.length >= 3 ? msg[2] : null;
	if (id !== null && id !== undefined) {
		cb = c.mAsyncCallbacks.get(id);
		if (cb != null && (/** @type {number} */(id) > 0)) {
			c.mAsyncCallbacks.delete(id);
		}
	} else {
		cb = c.mMainCallbacks.shift();
	}

	if (cb != null) {
		if (msg.length >= 2) {
			// failure
			cb(msg[0], msg[1]);
		} else {
			// success
			cb(msg[0]);
		}
	}
}

/**
 * Call this method when more data has arrived from server. Buffer will be parsed
 * and callbacks invoked for each complete response received.
 * @param {!Uint8Array} b - Byte buffer containing data to parse
 */
EventClient.prototype.onRecv = function(b) {
	this.mBuff.data = b;
	this.mBuff.idx = 0;
	this.mBuff.len = b.length;
	while (true) {
		var obj = this.mParser.parseNext(this.mBuff);
		if (obj == null) {
			break;
		}
		onResponse(this, obj);
	}
}

/**
 * Call this method when connection is closed. All request callbacks that have not received a response
 * will be notified of failure. Every persistent async callback will also be notified of failure.
 */
EventClient.prototype.onClose = function() {
	var tmp = this.mMainCallbacks;
	while (tmp.size() > 0) {
		var cb = tmp.shift();
		if (cb) {
			cb(null, OpaDef.ERR_CLOSED);
		}
	}

	tmp = this.mAsyncCallbacks;
	tmp.forEach(function(val, key, map) {
		if (val) {
			val(null, OpaDef.ERR_CLOSED);
		}
	});
	tmp.clear();
}

}());


function newClient(s) {
	var wrapper = {};
	var c = new EventClient(wrapper);

	wrapper.write = function(b) {
		// the node socket docs state that the return value from write() should indicate whether the buffer
		// is fully copied. however, this seems to be incorrect. therefore, a new buffer must be allocated
		// for the serializer.
		// TODO: consider a buffer pool to reuse buffers (write() will invoke a callback when done?)
		// TODO: back-pressure: this function could return true/false indicating whether stream is writable; store/use this somehow
		s.write(b);
		c.s.b = NEWBUF(c.s.b.length);
	};

	s.on("data", function(b) {
		c.onRecv(b);
	});

	s.on("close", function(hadError) {
		c.onClose();
	});

	return c;
}

module.exports.version = VERSION;
module.exports.stringify = opaStringify;
module.exports.opaType = opaType;
module.exports.OpaDef = OpaDef;
module.exports.BigDec = BigDec;
module.exports.newClient = newClient;

module.exports.PartialParser = PartialParser;

