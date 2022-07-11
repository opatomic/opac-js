/*
 * Copyright 2018-2019 Opatomic
 * Open sourced with ISC license. Refer to LICENSE for details.
 */

// Dependencies: BigInteger, BigDec, OpaDef, NEWBUF, STRENC

/**
 * @interface
 */
var IWriter = function() {};

/**
 * @param {!Uint8Array} buff
 * @return {boolean} false indicates caller should stop writing data; otherwise true
 */
IWriter.prototype.write = function(buff) {};

/**
 * Write all buffered bytes
 */
IWriter.prototype.flush = function() {};

/**
 * Close the stream and release all used resources
 */
IWriter.prototype.close = function() {};


/**
 * @constructor
 * @param {!IWriter} out - Where to write values
 * @param {number=} sz - Length of internal buffer
 */
var Serializer = function(out, sz) {};

(function() {

/**
 * @constructor
 * @param {!IWriter} out - Where to write values
 * @param {number=} sz - Length of internal buffer
 */
Serializer = function(out, sz) {
	if (sz && sz <= 10) {
		throw new Error("buffer len is too small");
	}
	/** @type {!IWriter} */
	this.o = out;
	/** @type {!Uint8Array} */
	this.b = NEWBUF(sz ? sz : 4096);
	/** @type {number} */
	this.i = 0;
	/** @type {boolean} */
	this.c = true;
};

var SURROGATE_OFFSET = 0x010000 - (0xD800 << 10) - 0xDC00;
var BIMAXVARINT = new BigInteger("9223372036854775807");
var BIMINVARINT = BIMAXVARINT.negate();
var BIGINT31 = new BigInteger("7FFFFFFF", 16);

// note: potential memory leak here. keeping a temp big int object for serialization, to prevent allocations
//  it does not get cleared after use. assume memory usage will not be very large for 1 value
var TMPBI2 = new BigInteger(null);

/**
 * @param {!Serializer} s
 * @return {boolean} false indicates caller should stop writing data; otherwise true
 */
function flushBuff(s) {
	if (s.i > 0) {
		s.c = s.o.write(s.i == s.b.length ? s.b : s.b.subarray(0, s.i));
		s.i = 0;
	}
	return s.c;
}

/**
 * @param {string} s
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
			// ascii chars are 1 byte (already accounted for)
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
					numBytes += 2;
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
 * @param {string} str
 */
function writeUtf8(ser, str) {
	var end = str.length;
	var bpos = ser.i;
	var buff = ser.b;
	for (var i = 0; i < end; ++i) {
		if (bpos + 4 > buff.length) {
			ser.i = bpos;
			flushBuff(ser);
			bpos = ser.i;
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
	ser.i = bpos;
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
		v = Math.floor(v / 128);
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
		writeTypeAndBigBytes(s, t, bigIntNegateTo(v, TMPBI2));
		return;
	}
	var bitLen = v.bitLength();
	var numBytes = (bitLen >> 3) + ((bitLen & 0x7) == 0 ? 0 : 1);
	// TODO: implement a function that doesn't require memory allocation
	var buff = v.toByteArray();
	if (!(buff.length == numBytes || buff.length == numBytes + 1)) {
		throw new Error("BigInteger.toByteArray() returned unexpected value");
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
		writeBIAsVI(s, t, bigIntNegateTo(v, TMPBI2));
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
		s.write1(CH_ZERO);
	} else if (sn > 0) {
		if (v.compareTo(BIMAXVARINT) <= 0) {
			writeBIAsVI(s, CH_POSVARINT, v);
		} else {
			writeTypeAndBigBytes(s, CH_POSBIGINT, v);
		}
	} else {
		if (v.compareTo(BIMINVARINT) >= 0) {
			writeBIAsVI(s, CH_NEGVARINT, v);
		} else {
			writeTypeAndBigBytes(s, CH_NEGBIGINT, v);
		}
	}
}

/**
 * @param {!Serializer} s
 * @param {!BigDec} v
 */
function writeBigDec(s, v) {
	var e = 0 - v.scale();
	var m = v.unscaledValue();
	if (e == 0) {
		writeBigInt(s, m);
	} else {
		var negExp = e < 0;
		e = negExp ? 0 - e : e;
		if (v.signum() > 0) {
			if (m.compareTo(BIMAXVARINT) <= 0) {
				writeTypeAndVarint(s, negExp ? CH_NEGPOSVARDEC : CH_POSPOSVARDEC, e);
				writeBIAsVI(s, 0, m);
			} else {
				writeTypeAndVarint(s, negExp ? CH_NEGPOSBIGDEC : CH_POSPOSBIGDEC, e);
				writeTypeAndBigBytes(s, 0, m);
			}
		} else {
			if (m.compareTo(BIMINVARINT) >= 0) {
				writeTypeAndVarint(s, negExp ? CH_NEGNEGVARDEC : CH_POSNEGVARDEC, e);
				writeBIAsVI(s, 0, m);
			} else {
				writeTypeAndVarint(s, negExp ? CH_NEGNEGBIGDEC : CH_POSNEGBIGDEC, e);
				writeTypeAndBigBytes(s, 0, m);
			}
		}
	}
}

/**
 * Write a single byte
 * @param {number} v
 * @memberof Serializer
 */
Serializer.prototype.write1 = function(v) {
	if (this.i >= this.b.length) {
		flushBuff(this);
	}
	this.b[this.i++] = v;
};

/**
 * Write a raw byte array
 * @param {!Uint8Array} b
 * @memberof Serializer
 */
Serializer.prototype.write = function(b) {
	if (b.length > this.b.length - this.i) {
		flushBuff(this);
		if (b.length >= this.b.length) {
			this.c = this.o.write(b);
			return;
		}
	}
	this.b.set(b, this.i);
	this.i += b.length;
};

/**
 * Force any buffered bytes to be written
 * @memberof Serializer
 */
Serializer.prototype.flush = function() {
	flushBuff(this);
	if (typeof this.o.flush === "function") {
		this.o.flush();
	}
};

/**
 * Serialize a number
 * @param {number} v
 * @memberof Serializer
 */
Serializer.prototype.writeNumber = function(v) {
	if (isSafeInteger(v)) {
		if (v > 0) {
			writeTypeAndVarint(this, CH_POSVARINT, v);
		} else if (v == 0) {
			this.write1(CH_ZERO);
		} else {
			writeTypeAndVarint(this, CH_NEGVARINT, 0 - v);
		}
	} else if (v === -Infinity) {
		this.write1(CH_NEGINF);
	} else if (v === Infinity) {
		this.write1(CH_POSINF);
	} else {
		if (typeof v != "number") {
			throw new Error("not a number");
		}
		if (isNaN(v)) {
			throw new Error("number is NaN; cannot be serialized");
		}
		writeBigDec(this, new BigDec(v.toString()));
	}
};

/**
 * Serialize a string
 * @param {string} v
 * @memberof Serializer
 */
Serializer.prototype.writeString = function(v) {
	if (v.length == 0) {
		this.write1(CH_EMPTYSTR);
		return;
	}
	if (v.length < 1024) {
		// TODO: what is the proper cutoff string length to use the built-in encoder vs iterating over each char?
		writeTypeAndVarint(this, CH_STRLPVI, getUtf8Len(v, 0, v.length));
		writeUtf8(this, v);
	} else {
		var b = STRENC(v);
		writeTypeAndVarint(this, CH_STRLPVI, b.length);
		this.write(b);
	}
};

/**
 * Serialize an Array
 * @param {!Array} v
 * @memberof Serializer
 */
Serializer.prototype.writeArray = function(v) {
	if (v.length == 0) {
		this.write1(CH_EMPTYARRAY);
	} else {
		this.write1(CH_ARRAYSTART);
		for (var i = 0; i < v.length; ++i) {
			this.writeObject(v[i]);
		}
		this.write1(CH_ARRAYEND);
	}
};

/**
 * Serialize any supported value (undefined/null/boolean/number/bigint/string/Uint8Array/BigInteger/BigDec/OpaDef.SORTMAX_OBJ)
 * or an Object with toOpaSO() property, or an Array containing any of the previously listed types.
 * @param {*} v
 * @memberof Serializer
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
			writeBigInt(this, bigIntFromNativeBigInt(/** @type {bigint} */(v)));
			break;
		case "boolean":
			this.write1(v ? CH_TRUE : CH_FALSE);
			break;
		case "undefined":
			this.write1(CH_UNDEFINED);
			break;
		case "object":
			v = /** @type {?Object} */ (v); // eslint-disable-line no-self-assign
			if (v === null) {
				this.write1(CH_NULL);
			} else if (Object.prototype.hasOwnProperty.call(v, "toOpaSO") && typeof v.toOpaSO == "function") {
				v.toOpaSO(this);
			} else if (Array.isArray(v)) {
				this.writeArray(v);
			} else if (v === OpaDef.SORTMAX_OBJ) {
				this.write1(CH_SORTMAX);
			} else if (v instanceof BigInteger) {
				writeBigInt(this, v);
			} else if (v instanceof BigDec) {
				writeBigDec(this, v);
			} else if (v.constructor.name == "Uint8Array" || v.constructor.name == "Buffer") {
				v = /** @type {!Uint8Array} */ (v); // eslint-disable-line no-self-assign
				if (v.length == 0) {
					this.write1(CH_EMPTYBIN);
				} else {
					writeTypeAndVarint(this, CH_BINLPVI, v.length);
					this.write(v);
				}
			} else {
				throw new Error("unsupported object type " + v.constructor.name);
			}
			break;
		default:
			throw new Error("unsupported type " + typeof v);
	}
};

}());

