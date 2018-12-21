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

var P = Serializer.prototype;

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
		this.write1(OpaDef.EMPTYARRAY);
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
			} else if (v.toOpaSO && (typeof v.toOpaSO) == "function") {
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

P.STR2BUF = new Map();

