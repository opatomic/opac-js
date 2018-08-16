"use strict";

const Deque = require("double-ended-queue");
const BigInteger = require("jsbn").BigInteger;

const NEWBUF = function(l) {
	// TODO: ok to use unsafe here?
	return Buffer.allocUnsafe(l);
}
const STRENC = function(s) {
	return Buffer.from(s, "utf-8");
}
const STRDEC = function(b) {
	return b.toString("utf-8");
}
const BTOA = function(v) {
	return Buffer.from(v).toString("base64");
}

var P;

const VERSION = "0.1.2";

// #### Contents of BigDec.js ####

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

function BigDec(man, exp) {
	if (man && typeof man == "string") {
		bdFromString(this, man);
	} else {
		this.m = man;
		this.e = exp;
	}
}

function nbd() { return new BigDec(new BigInteger(null), 0); }

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
		if (!Number.isSafeInteger(v.e)) {
			throw 'number string "' + s + '" cannot be parsed';
		}
	}
	if (decPos >= 0) {
		v.e -= epos < 0 ? s.length - decPos - 1 : epos - decPos - 1;
	}
}

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

// r = a + b
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

// r = a - b
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

// r = a * b
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

// q = a / b
// r = a % b
// q or r may be null
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
		a.copyTo(q);
		a.copyTo(r);
	} else {
		if (a.e > b.e) {
			a = extend(a, a.e - b.e);
		} else if (a.e < b.e) {
			b = extend(b, b.e - a.e);
		}
		
		// TODO: is this correct?
		a.m.divRemTo(b.m, q.m, r.m);
		q.e = 0;
		r.e = 0;
	}
}

P = BigDec.prototype;

P.abs = function() {
	return this.m.signum() < 0 ? new BigDec(this.m.abs(), this.e) : this;
}

P.add = function(b) {
	var r = nbd();
	add3(this, b, r);
	return r;
}

P.clone = function() {
	return new BigDec(this.m.clone(), this.e);
}

P.compareTo = function(b) {
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

P.copyTo = function(r) {
	this.m.copyTo(r.m);
	r.e = this.e;
}

/*
P.divideAndRemainder = function(b) {
	var q = nbd();
	var r = nbd();
	div(this, b, q, r);
	return [q, r];
}

P.equals = function(b) {
	return this.compareTo(b) == 0;
}

P.max = function(b) {
	return this.compareTo(b) > 0 ? this : b;
}

P.min = function(b) {
	return this.compareTo(b) < 0 ? this : b;
}
*/

P.multiply = function(b) {
	var r = nbd();
	mul3(this, b, r);
	return r;
}

P.signum = function() {
	return this.m.signum();
}

P.subtract = function(b) {
	var r = nbd();
	sub3(this, b, r);
	return r;
}

// TODO: return same string that java returns
P.toString = function() {
	var s = this.m.toString();
	if (this.e != 0) {
		s += "e" + this.e.toString();
	}
	return s;
}

// #### Contents of OpaDef.js ####


function CC(s) {
	return s.charCodeAt(0);
}

var OpaDef = {
	UNDEFINED    : CC("U"),
	NULL         : CC("N"),
	FALSE        : CC("F"),
	TRUE         : CC("T"),
	ZERO         : CC("!"),
	EMPTYBIN     : CC("b"),
	EMPTYSTR     : CC("s"),
	EMPTYLIST    : CC("_"),
	SORTMAX      : CC("Z"),

	POSVARINT    : CC("$"),
	NEGVARINT    : CC("%"),
	POSPOSVARDEC : CC("P"),
	POSNEGVARDEC : CC("Q"),
	NEGPOSVARDEC : CC("R"),
	NEGNEGVARDEC : CC("V"),
	POSBIGINT    : CC("G"),
	NEGBIGINT    : CC("H"),
	POSPOSBIGDEC : CC("I"),
	POSNEGBIGDEC : CC("J"),
	NEGPOSBIGDEC : CC("K"),
	NEGNEGBIGDEC : CC("M"),

	BINLPVI      : CC("B"),
	STRLPVI      : CC("S"),

	ARRAYSTART   : CC("["),
	ARRAYEND     : CC("]"),

	UndefinedObj  : undefined,
	NullObj       : null,
	FalseObj      : false,
	TrueObj       : true,
	ZeroIntObj    : 0,
	EmptyBinObj   : new Uint8Array(0),
	EmptyStrObj   : "",
	EmptyArrayObj : [],
};

// #### Contents of PartialParser.js ####

// Dependencies: BigInteger, BigDec, OpaDef, NEWBUF, STRDEC

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

function PartialParser() {
	this.mContainers = [];
	this.mCurrCont = null;
	this.mState = S_NEXTOBJ;
	this.mNextState = 0;
	this.mNextState2 = 0;
	this.mVarintVal = 0;
	this.mVarintMul = 0;
	this.mVarintBitshift = 0;
	this.mDecExp = 0;
	this.mObjType = 0;
	this.mBytesIdx = 0;
	this.mBytesLen = 0;
	this.mBytes = null;
}

function throwErr(p, msg) {
	p.mState = S_ERR;
	throw msg;
}

function hitNext(p, o) {
	if (p.mCurrCont == null) {
		throwErr(p, "no array container");
	}
	p.mCurrCont.push(o);
}

function initVarint(p, objType, nextState) {
	p.mState = S_VARINT1;
	p.mNextState = nextState;
	p.mObjType = objType;
	p.mVarintVal = 0;
	p.mVarintMul = 1;
	p.mVarintBitshift = 0;
}

function initBytes(p, objType, nextState) {
	initVarint(p, objType, S_BYTES1);
	p.mNextState2 = nextState;
}

function getVarint32(p, neg) {
	if (typeof p.mVarintVal != "number" || p.mVarintVal > 2147483647) {
		throwErr(p, "varint out of range");
	}
	return neg ? 0 - p.mVarintVal : p.mVarintVal;
}

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

// read a byte array in big-endian format that is always positive (does not have a sign bit)
// custom function similar to bnpFromString(s,256);
// see also, java constructor: public BigInteger(int signum, byte[] magnitude)
//   https://docs.oracle.com/javase/7/docs/api/java/math/BigInteger.html#BigInteger(int,%20byte[])
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

function bigIntFromBytes(p, neg) {
	//var b = p.mBytes.subarray(0, p.mBytesLen);
	return getNum(neg, bigintFromBytes2(p.mBytes, p.mBytesLen, new BigInteger(null)));
}

function bigIntFromNumber(n) {
	if (n < 0) {
		var bi = bigIntFromNumber(0 - n);
		BigInteger.ZERO.subTo(bi, bi);
		return bi;
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
			p.mVarintVal = bigIntFromNumber(p.mVarintVal);
		}
		TMPBI1.fromInt(bval & 0x7F);
		TMPBI1.lShiftTo(p.mVarintBitshift, TMPBI1);
		p.mVarintVal.addTo(TMPBI1, p.mVarintVal);
	}
	p.mVarintBitshift += 7;
}

function getstr(p, b) {
	var str = p.BUF2STR ? p.BUF2STR.get(b) : null;
	return str ? str : STRDEC(b);
}

function clearBytes(p) {
	if (p.mBytes.length > 4096) {
		p.mBytes = null;
	}
}

P = PartialParser.prototype;

P.newBuff = function() {
	return {data: null, idx: 0, len: 0};
}

P.parseNext = function(b) {
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
					case OpaDef.UNDEFINED: hitNext(p, OpaDef.UndefinedObj);  continue;
					case OpaDef.NULL:      hitNext(p, OpaDef.NullObj);       continue;
					case OpaDef.FALSE:     hitNext(p, OpaDef.FalseObj);      continue;
					case OpaDef.TRUE:      hitNext(p, OpaDef.TrueObj);       continue;
					case OpaDef.ZERO:      hitNext(p, OpaDef.ZeroIntObj);    continue;
					case OpaDef.EMPTYBIN:  hitNext(p, OpaDef.EmptyBinObj);   continue;
					case OpaDef.EMPTYSTR:  hitNext(p, OpaDef.EmptyStrObj);   continue;
					case OpaDef.EMPTYLIST: hitNext(p, OpaDef.EmptyArrayObj); continue;

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
						var parent = p.mContainers.pop();
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

PartialParser.prototype.BUF2STR = new Map();

// #### Contents of Serializer.js ####

// Dependencies: BigInteger, BigDec, OpaDef, NEWBUF, STRENC

const SURROGATE_OFFSET = 0x010000 - (0xD800 << 10) - 0xDC00;
const BIMAXVARINT = new BigInteger("9223372036854775807");
const BIMINVARINT = BIMAXVARINT.negate();
const BIGINT31 = new BigInteger("7FFFFFFF", 16);

// note: potential memory leak here. keeping a temp big int object for serialization, to prevent allocations
//  it does not get cleared after use. assume memory usage will not be very large for 1 value
const TMPBI2 = new BigInteger(null);

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


function Serializer(out, sz) {
	if (sz && sz <= 10) {
		throw "buffer len is too small";
	}
	this.o = out;
	this.b = NEWBUF(sz ? sz : 4096);
	this.i = 0;
}

function flushBuff(s) {
	if (s.i > 0) {
		s.o.write(s.i == s.b.length ? s.b : s.b.subarray(0, s.i));
		s.i = 0;
	}
}

function ensureSpace(s, l) {
	if (s.i + l > s.b.length) {
		flushBuff(s);
	}
}

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
	
	v = v.intValue();
	while (v > 0x7F) {
		s.b[s.i++] = 0x80 | (v & 0xFF);
		v >>>= 7;
	}
	s.b[s.i++] = v;
}

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

P = Serializer.prototype;

P.write1 = function(v) {
	if (this.i >= this.b.length) {
		flushBuff(this);
	}
	this.b[this.i++] = v;
}

P.write = function(b) {
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

P.flush = function() {
	flushBuff(this);
	if (typeof this.o.flush === "function") {
		this.o.flush();
	}
}

P.writeNumber = function(v) {	
	if (Number.isSafeInteger(v)) {
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

P.writeString = function(v) {
	if (v.length == 0) {
		this.write1(OpaDef.EMPTYSTR);
		return;
	}
	var b;
	if (this.STR2BUF) {
		b = this.STR2BUF.get(v);
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

P.writeArray = function(v) {
	if (v.length == 0) {
		this.write1(OpaDef.EMPTYLIST);
	} else {
		this.write1(OpaDef.ARRAYSTART);
		for (var i = 0; i < v.length; ++i) {
			this.writeObject(v[i]);
		}
		this.write1(OpaDef.ARRAYEND);
	}
}

P.writeObject = function(v) {
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
			if (v === null) {
				this.write1(OpaDef.NULL);
			} else if (Array.isArray(v)) {
				this.writeArray(v);
			} else if (v.constructor.name == "BigInteger") {
				writeBigInt(this, v);
			} else if (v.constructor.name == "BigDec") {
				writeBigDec(this, v);
			} else if (v.constructor.name == "Uint8Array" || v.constructor.name == "Buffer") {
				if (v.length == 0) {
					this.write1(OpaDef.EMPTYBIN);
				} else {
					writeTypeAndVarint(this, OpaDef.BINLPVI, v.length);
					this.write(v);
				}
			} else if (typeof v.toOpaSO === "function") {
				v.toOpaSO(this);
			} else {
				throw "unsupported object type " + v.constructor.name;
			}
			break;
		default:
			throw "unsupported type " + typeof v;
	}
}

Serializer.prototype.STR2BUF = new Map();

// #### Contents of OpaUtils.js ####


function opaType(o) {
	// TODO: handle sortmin, sortmax
	var t = typeof o;
	if (t == "object") {
		if (o === null) {
			return "null";
		} else if (o.constructor.name == "BigInteger") {
			return "BigInteger";
		} else if (o.constructor.name == "BigDec") {
			return "BigDec";
		} else if (o.constructor.name == "Uint8Array") {
			return "Uint8Array";
		} else if (o.constructor.name == "Buffer") {
			return "Buffer";
		} else if (Array.isArray(o)) {
			return "Array";
		} else {
			return "object";
		}
		//throw "unknown object " + o.constructor.name + " " + o.toString();
	} else if (t == "string" || t == "number" || t == "boolean" || t == "undefined") {
		return t;
	}
	throw "unknown object " + o.toString();
}

function indent(space, depth) {
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

function opaStringify(obj, space, depth) {
	switch (opaType(obj)) {
		case "undefined":
			return "undefined";
		case "null":
			return "null";
		case "boolean":
		case "number":
		//case "BigInteger":
		//case "BigDec":
			return obj.toString();
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
        	return '"~base64' + BTOA(String.fromCharCode.apply(null, obj)) + '"';
		case "string":
			return JSON.stringify(obj.charAt(0) == "~" ? "~" + obj : obj);
		case "Array":
			if (obj.length == 0) {
				return "[]";
			}
			depth = depth ? depth : 0;
			var strs = [];
			for (var i = 0; i < obj.length; ++i) {
				strs[i] = opaStringify(obj[i], space, depth + 1);
			}
			if (!space) {
				return "[" + strs.join(",") + "]";
			}
			var indent1 = indent(space, depth);
			var indent2 = indent(space, depth + 1);
			return "[\n" + indent2 + strs.join(",\n" + indent2) + "\n" + indent1 + "]";
	}
	if (typeof obj.toString === "function") {
		return obj.toString();
	}
	throw "unhandled case in switch";
}

// #### Contents of StreamClient.js ####

// dependencies: STRENC PartialParser Serializer Deque Map

/**
 * @callback responseCallback
 * @param {Object} result - The result of the operation. Can be null.
 * @param {Object} error  - If response is an error then result is null and error is non-null
 */


/**
 * Create new StreamClient.
 * @param o - Object that has a write() and flush() method. 
 */
function StreamClient(o) {
	this.s = new Serializer(o);
	this.id = 0;
	this.mMainCallbacks = new Deque();
	this.mAsyncCallbacks = new Map();
	this.mParser = new PartialParser();
	this.mBuff = this.mParser.newBuff();
	this.mTimeout = null;
	this.mCmdCache = new Map();
}

P = StreamClient.prototype;

function schedTimeout(c) {
	if (c.mTimeout === null) {
		// TODO: use process.nextTick() in node?
		c.mTimeout = setTimeout(function() {
			c.mTimeout = null;
			c.s.flush();
		}, 0);
	}
}

function writeCommand(c, cmd) {
	var b = c.mCmdCache != null ? c.mCmdCache.get(cmd) : STRENC(cmd);
	if (!b) {
		b = STRENC(cmd);
		c.mCmdCache.set(cmd, b);
	}
	writeTypeAndVarint(c.s, OpaDef.STRLPVI, b.length);
	c.s.write(b);
}

function callNoResponse(c, cmd, args) {
	// if no callback is specified then send null as async id indicating server must not send response
	c.s.write1(OpaDef.ARRAYSTART);
	writeCommand(c, cmd);
	c.s.writeObject(args);
	c.s.write1(OpaDef.NULL);
	c.s.write1(OpaDef.ARRAYEND);
}

/**
 * Send all buffered requests.
 */
P.flush = function() {
	if (this.mTimeout != null) {
		clearTimeout(this.mTimeout);
		this.mTimeout = null;
	}
	this.s.flush();
}

/**
 * Sends the specified command and args to the server. Invokes the specified callback when a response is received.
 * @param {string} cmd - The command to run
 * @param {array} args - The parameters for the command
 * @param {responseCallback} cb - A callback function to invoke when the response is received
 */
P.call = function(cmd, args, cb) {
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

function callId(c, cmd, args, cb, isP) {
	//if (!cb) {
	//	return callNoResponse(c, cmd, args);
	//}
	
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
 * @param {array} args - The parameters for the command
 * @param {responseCallback} cb - A callback function to invoke when the response is received
 */
P.callAsync = function(cmd, args, cb) {
	callId(this, cmd, args, cb, 0);
}

/**
 * Same as callAsync() except that the callback can be invoked multiple times. Use this for subscriptions.
 * @param {string} cmd - The command to run
 * @param {array} args - The parameters for the command
 * @param {responseCallback} cb - A callback function to invoke when the responses are received
 * @return {*} - The value that is used when calling unregister()
 */
P.callPersistent = function(cmd, args, cb) {
	return callId(this, cmd, args, cb, 1);
}

/**
 * Removes the specified async callback from the client. Use this when unsubscribing from a channel.
 * @param {*} id - The value that was returned from callPersistent()
 */
P.unregister = function(id) {
	return this.mAsyncCallbacks.delete(id);
}

function onResponse(c, msg) {
	var cb;
	var id = msg.length >= 3 ? msg[2] : null;
	if (id !== null && id !== undefined) {
		cb = c.mAsyncCallbacks.get(id);
		if (id > 0) {
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
 * @param b - Byte buffer containing data to parse. Type is Uint8Array when running in browser.
 *            Type is Buffer when running in node
 */
P.onRecv = function(b) {
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
 * Cache the utf-8 bytes for a string in memory. Improves performance slightly by
 * avoiding an allocation + conversion every time the string is serialized or parsed.
 * Use for strings that are repeated often.
 * @param {string} s - The string to cache
 */
P.cacheString = function(s) {
	var b = STRENC(s);
	if (this.mParser.BUF2STR) {
		this.mParser.BUF2STR.set(b, s);
	}
	if (this.s.STR2BUF) {
		this.s.STR2BUF.set(s, b);
	}
}


function newClient(s) {
	var wrapper = {};
	var c = new StreamClient(wrapper);

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
	
	return c;
}

module.exports.version = VERSION;
module.exports.stringify = opaStringify;
module.exports.opaType = opaType;
module.exports.OpaDef = OpaDef;
module.exports.BigDec = BigDec;
module.exports.newClient = newClient;

module.exports.PartialParser = PartialParser;

