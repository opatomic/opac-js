/*
 * Copyright 2018-2019 Opatomic
 * Open sourced with ISC license. Refer to LICENSE for details.
 */

// dependencies: BigInteger

/*
TODO:
 allow user to specify the BigInteger lib to use
 add MathContext to methods that accept it in Java API
 constructor: throw exception if string is invalid? see java API for details
 create an ArithmeticException class that extends Error? also NumberFormatException for constructor? see https://stackoverflow.com/a/43595019
 allow user to specify the exception classes to throw?

methods missing but could be added:
 plus

newer methods to investigate:
 sqrt (Java 9)

methods missing and unlikely to be added:
 doubleValue
 floatValue
 hashCode
 longValue - difficult because long isn't easily represented in javascript (exceeds MAX_SAFE_INTEGER)
 longValueExact - same as longValue
 valueOf
*/

/** @enum {number} */
var RoundingMode = {
	UP: 0,
	DOWN: 1,
	CEILING: 2,
	FLOOR: 3,
	HALF_UP: 4,
	HALF_DOWN: 5,
	HALF_EVEN: 6,
	UNNECESSARY: 7
};

/**
 * @constructor
 * @param {!BigInteger|string|number} a
 * @param {number=} b
 */
function BigDec(a, b) {
	/**
	 * @ignore
	 * @param {!BigDec} v
	 * @param {string} s
	 */
	function bdFromString(v, s) {
		var decPos = s.indexOf(".");
		if (decPos >= 0) {
			s = s.replace(".", "");
		}
		var epos = s.indexOf("e");
		if (epos < 0) {
			epos = s.indexOf("E");
		}
		if (epos < 0) {
			v.m = new BigInteger(s);
			v.s = 0;
		} else {
			// ignore "+" char immediately following e/E
			var skipLen = s.charCodeAt(epos + 1) == 43 ? 2 : 1;
			v.m = new BigInteger(s.substring(0, epos));
			v.s = 0 - parseInt(s.substring(epos + skipLen), 10);
		}
		if (decPos >= 0) {
			v.s += epos < 0 ? s.length - decPos : epos - decPos;
		}
	}

	var t = typeof a;
	if (t == "string") {
		a = /** @type {string} */ (a); // eslint-disable-line no-self-assign
		if (a.charCodeAt(0) === 43) {
			a = a.substring(1);
		}
		bdFromString(this, a);
	} else if (t == "number") {
		a = /** @type {number} */ (a); // eslint-disable-line no-self-assign
		if (!isFinite(a)) {
			throw new Error("BigDec does not support Inf/-Inf/NaN");
		}
		bdFromString(this, a.toString());
	} else {
		/**
		 * @type {!BigInteger}
		 * @ignore
		 */
		this.m = a ? /** @type {!BigInteger} */ (a) : new BigInteger("0");
		/**
		 * @type {number}
		 * @ignore
		 */
		this.s = b ? b : 0;
	}
	if (!isSafeInteger(this.s) || this.s < -2147483648 || this.s > 2147483647) {
		throw new Error("scale is out of range");
	}
}

(function() {

var BI_N1 = new BigInteger("-1");
var BI_0 = new BigInteger("0");
var BI_1 = new BigInteger("1");
var BI_5 = new BigInteger("5");
var BI_10 = new BigInteger("10");

var BI_BYTE_MIN = new BigInteger("-128");
var BI_BYTE_MAX = new BigInteger("127");
var BI_SHORT_MIN = new BigInteger("-32768");
var BI_SHORT_MAX = new BigInteger("32767");
var BI_INT_MIN = new BigInteger("-2147483648");
var BI_INT_MAX = new BigInteger("2147483647");

var BD_0 = new BigDec(BI_0);
var BD_1 = new BigDec(BI_1);

/**
 * @type {!Array<!BigInteger>}
 */
var POW10S = new Array(16);
POW10S[0] = BI_1;

/** @type {!RoundingMode} */
BigDec.ROUND_CEILING = RoundingMode.CEILING;
/** @type {!RoundingMode} */
BigDec.ROUND_DOWN = RoundingMode.DOWN;
/** @type {!RoundingMode} */
BigDec.ROUND_FLOOR = RoundingMode.FLOOR;
/** @type {!RoundingMode} */
BigDec.ROUND_HALF_DOWN = RoundingMode.HALF_DOWN;
/** @type {!RoundingMode} */
BigDec.ROUND_HALF_EVEN = RoundingMode.HALF_EVEN;
/** @type {!RoundingMode} */
BigDec.ROUND_HALF_UP = RoundingMode.HALF_UP;
/** @type {!RoundingMode} */
BigDec.ROUND_UNNECESSARY = RoundingMode.UNNECESSARY;
/** @type {!RoundingMode} */
BigDec.ROUND_UP = RoundingMode.UP;

/** @type {!BigDec} */
BigDec.ONE = BD_1;
/** @type {!BigDec} */
BigDec.TEN = new BigDec(BI_10);
/** @type {!BigDec} */
BigDec.ZERO = BD_0;

/**
 * @param {!BigDec} bd
 * @return {!BigInteger}
 */
function unscaledValue(bd) {
	return bd.m;
}

/**
 * @param {!BigDec} bd
 * @return {number}
 */
function getScale(bd) {
	return bd.s;
}

/**
 * @param {!BigInteger} bi
 * @return {boolean}
 */
function isZero(bi) {
	return bi.signum() == 0;
}

/**
 * @param {!Array<!BigInteger>} a
 * @return {boolean}
 */
function hasRemainder(a) {
	return !isZero(/** @type {!BigInteger} */ (a[1]));
}

/**
 * @param {number} n
 * @return {!BigInteger}
 */
function pow10(n) {
	if (n < 16) {
		var t = POW10S[n];
		if (!t) {
			t = BI_10.pow(n);
			POW10S[n] = t;
		}
		return t;
	}
	return BI_10.pow(n);
}

/**
 * @param {!BigInteger} m
 * @param {number} n
 * @return {!BigInteger}
 */
function mulPow10(m, n) {
	return n == 0 ? m : m.multiply(pow10(n));
}

/**
 * @return {!BigDec}
 */
BigDec.prototype.abs = function() {
	var m = unscaledValue(this);
	return m.signum() < 0 ? new BigDec(m.negate(), getScale(this)) : this;
};

/**
 * @param {!BigDec} augend
 * @return {!BigDec}
 */
BigDec.prototype.add = function(augend) {
	var m1 = unscaledValue(this);
	var m2 = unscaledValue(augend);
	var s1 = getScale(this);
	var s2 = getScale(augend);
	if (s2 > s1) {
		m1 = mulPow10(m1, s2 - s1);
	} else if (s1 > s2) {
		m2 = mulPow10(m2, s1 - s2);
	}
	return new BigDec(m1.add(m2), Math.max(s1, s2));
};

/**
 * @return {number}
 */
BigDec.prototype.byteValue = function() {
	return this.toBigInteger().byteValue();
};

/**
 * @param {!BigDec} b
 * @param {!BigInteger} min
 * @param {!BigInteger} max
 * @return {number}
 */
function numberExact(b, min, max) {
	var m = b.toBigIntegerExact();
	if (m.compareTo(min) < 0 || m.compareTo(max) > 0) {
		throw new Error("Out of range");
	}
	return m.intValue();
}

/**
 * @return {number}
 */
BigDec.prototype.byteValueExact = function() {
	return numberExact(this, BI_BYTE_MIN, BI_BYTE_MAX);
};

/**
 * @return {!BigDec}
 */
BigDec.prototype.clone = function() {
	return new BigDec(unscaledValue(this).clone(), getScale(this));
};

/**
 * @param {!BigDec} val
 * @return {number}
 */
BigDec.prototype.compareTo = function(val) {
	var m1 = unscaledValue(this);
	var m2 = unscaledValue(val);
	var sn1 = m1.signum();
	var sn2 = m2.signum();
	if (sn1 != sn2) {
		return sn1 < sn2 ? -1 : 1;
	}
	if (sn1 == 0) {
		return 0;
	}

	var sdiff = getScale(val) - getScale(this);
	if (sdiff != 0) {
		var bits1 = m1.bitLength();
		var bits2 = m2.bitLength();

		// TODO: if exp's are not equal, can estimate comparison based on number of bits
		//  each power of ten is worth which could prevent having to call mulPow10()

		if (sdiff > 0) {
			if (bits1 > bits2) {
				// magnitude/bits and exponent of 'this' are larger
				return sn1;
			}
			m1 = mulPow10(m1, sdiff);
		} else {
			if (bits1 < bits2) {
				// magnitude/bits and exponent of 'this' are smaller
				return 0 - sn1;
			}
			m2 = mulPow10(m2, 0 - sdiff);
		}
	}
	// note: JSBN does not return -1/0/1; adjust the return value to be consistent with java API
	var res = m1.compareTo(m2);
	return res > 0 ? 1 : (res < 0 ? -1 : 0);
};

/**
 * @param {!BigInteger} bi
 * @param {number} n
 * @return {!BigInteger}
 */
function shiftRight(bi, n) {
	// note: only call shiftRight() if n!=0 because jsbn will allocate new object for a right shift of 0
	return n == 0 ? bi : bi.shiftRight(n);
}

/**
 * @param {!BigDec} a
 * @param {!BigDec} b
 * @return {!BigDec}
 */
function divExact(a, b) {
	var m1 = unscaledValue(a);
	var m2 = unscaledValue(b);
	if (isZero(m2)) {
		throw new Error("cannot divide by 0");
	}
	var s1 = getScale(a);
	var s2 = getScale(b);
	// Java BigDecimal API says the "preferred scale" is dividend.scale() - divisor.scale()
	var preferredScale = s1 - s2;
	if (isZero(m1)) {
		return new BigDec(BI_0, preferredScale);
	}
	var gcd = m1.gcd(m2);
	var bv = m2.divide(gcd).abs();
	// remove all multiples of 2
	var pow2 = bv.getLowestSetBit();
	bv = shiftRight(bv, pow2);
	var pow5 = 0;
	// must be multiple of 5 to be terminating
	for (; bv.compareTo(BI_1) != 0; ++pow5) {
		var t = bv.divideAndRemainder(BI_5);
		if (hasRemainder(t)) {
			throw new Error("quotient is non-terminating");
		}
		bv = t[0];
	}
	var m3 = m1.divide(gcd);
	m3 = pow2 > pow5 ? m3.multiply(BI_5.pow(pow2 - pow5)) : shiftRight(m3, pow2 - pow5);
	return new BigDec(m2.signum() < 0 ? m3.negate() : m3, preferredScale + Math.max(pow2, pow5));
}

/**
 * @param {!BigInteger} a
 * @param {!BigInteger} b
 * @param {number} scale
 * @param {!RoundingMode} rm
 * @return {!BigDec}
 */
function divRM(a, b, scale, rm) {
	var t = a.divideAndRemainder(b);
	var q = /** @type {!BigInteger} */ (t[0]);
	if (hasRemainder(t)) {
		var extra = 0;
		var sign = a.signum() * b.signum();
		switch (rm) {
			case RoundingMode.FLOOR:
				extra = sign < 0 ? -1 : 0;
				break;
			case RoundingMode.CEILING:
				extra = sign > 0 ? 1 : 0;
				break;
			case RoundingMode.DOWN:
				break;
			case RoundingMode.UP:
				extra = sign;
				break;

			case RoundingMode.HALF_DOWN:
			case RoundingMode.HALF_EVEN:
			case RoundingMode.HALF_UP:
				// TODO: could create compareMagnitude() to avoid 2x abs() calls
				var t2 = t[1].abs().shiftLeft(1).compareTo(b.abs());
				if (t2 > 0) {
					extra = sign;
				} else if (t2 == 0) {
					if (rm == RoundingMode.HALF_UP) {
						extra = sign;
					} else if (rm == RoundingMode.HALF_EVEN) {
						extra = q.testBit(0) ? sign : 0;
					}
				}
				break;

			case RoundingMode.UNNECESSARY:
				throw new Error("Rounding mode is UNNECESSARY but rounding is needed");
			default:
				// TODO: throw if invalid RoundingMode passed? (java throws IllegalArgumentException from divide(BigDecimal divisor, int roundingMode) )
				break;
		}
		if (extra) {
			q = q.add(extra > 0 ? BI_1 : BI_N1);
		}
	}
	return new BigDec(q, scale);
}

/**
 * @param {!BigDec} divisor
 * @param {(!RoundingMode|number)=} b
 * @param {!RoundingMode=} c
 * @return {!BigDec}
 */
BigDec.prototype.divide = function(divisor, b, c) {
	if (arguments.length <= 1) {
		return divExact(this, divisor);
	} else if (arguments.length == 2) {
		// divide(BigDecimal divisor, RoundingMode roundingMode)
		return this.divide(divisor, getScale(this), /** @type {!RoundingMode} */ (b));
	} else {
		// divide(BigDecimal divisor, int scale, RoundingMode roundingMode)
		b = /** @type {number} */ (b); // eslint-disable-line no-self-assign
		var m1 = unscaledValue(this);
		var m2 = unscaledValue(divisor);
		if (isZero(m2)) {
			throw new Error("cannot divide by 0");
		}
		var sdiff = getScale(this) - getScale(divisor) - b;
		if (sdiff < 0) {
			m1 = mulPow10(m1, 0 - sdiff);
		} else if (sdiff > 0) {
			m2 = mulPow10(m2, sdiff);
		}
		return divRM(m1, m2, b, /** @type {!RoundingMode} */ (c));
	}
};

/**
 * @param {!BigDec} divisor
 * @return {!Array<!BigDec>}
 */
BigDec.prototype.divideAndRemainder = function(divisor) {
	var q = this.divideToIntegralValue(divisor);
	return [q, this.subtract(q.multiply(divisor))];
};

/**
 * @param {!BigDec} divisor
 * @return {!BigDec}
 */
BigDec.prototype.divideToIntegralValue = function(divisor) {
	var m1 = unscaledValue(this);
	var m2 = unscaledValue(divisor);
	if (isZero(m2)) {
		throw new Error("cannot divide by 0");
	}
	var m3;
	var p;
	var newScale = getScale(this) - getScale(divisor);
	if (newScale == 0) {
		m3 = m1.divide(m2);
	} else if (newScale > 0) {
		p = pow10(newScale);
		m3 = m1.divide(m2.multiply(p)).multiply(p);
	} else {
		m3 = mulPow10(m1, 0 - newScale).divide(m2);
		var currScale = 0;
		while (currScale > newScale) {
			var t = m3.divideAndRemainder(BI_10);
			if (hasRemainder(t)) {
				break;
			}
			m3 = /** @type {!BigInteger} */ (t[0]);
			--currScale;
		}
		newScale = currScale;
	}
	return new BigDec(m3, newScale);
};

/**
 * @param {*} x
 * @return {boolean}
 */
BigDec.prototype.equals = function(x) {
	if (x instanceof BigDec) {
		// note: in Java, BigDecimal.equals() returns false if scale is unequal, even if compareTo() would return 0
		// TODO: can call BigInteger.equals() rather than BigInteger.compareTo() here?
		return getScale(this) == getScale(x) && unscaledValue(this).compareTo(unscaledValue(x)) == 0;
	}
	return false;
};

/**
 * @return {number}
 */
BigDec.prototype.intValue = function() {
	return this.toBigInteger().intValue();
};

/**
 * @return {number}
 */
BigDec.prototype.intValueExact = function() {
	return numberExact(this, BI_INT_MIN, BI_INT_MAX);
};

/**
 * @param {!BigDec} val
 * @return {!BigDec}
 */
BigDec.prototype.max = function(val) {
	return this.compareTo(val) >= 0 ? this : val;
};

/**
 * @param {!BigDec} val
 * @return {!BigDec}
 */
BigDec.prototype.min = function(val) {
	return this.compareTo(val) <= 0 ? this : val;
};

/**
 * @param {!BigDec} v
 * @param {number} newScale
 * @return {!BigDec}
 */
function movePoint(v, newScale) {
	var m = unscaledValue(v);
	if (newScale >= 0) {
		return new BigDec(m, newScale);
	}
	return new BigDec(mulPow10(m, 0 - newScale), 0);
}

/**
 * @param {number} n
 * @return {!BigDec}
 */
BigDec.prototype.movePointLeft = function(n) {
	return movePoint(this, getScale(this) + n);
};

/**
 * @param {number} n
 * @return {!BigDec}
 */
BigDec.prototype.movePointRight = function(n) {
	return movePoint(this, getScale(this) - n);
};

/**
 * @param {!BigDec} multiplicand
 * @return {!BigDec}
 */
BigDec.prototype.multiply = function(multiplicand) {
	return new BigDec(unscaledValue(this).multiply(unscaledValue(multiplicand)), getScale(this) + getScale(multiplicand));
};

/**
 * @return {!BigDec}
 */
BigDec.prototype.negate = function() {
	return new BigDec(unscaledValue(this).negate(), getScale(this));
};

/**
 * @param {number} n
 * @return {!BigDec}
 */
BigDec.prototype.pow = function(n) {
	if (n === 0) {
		return BD_1;
	}
	if (n < 0) {
		throw new Error("Invalid power");
	}
	return new BigDec(unscaledValue(this).pow(n), getScale(this) * n);
};

/**
 * @return {number}
 */
BigDec.prototype.precision = function() {
	// TODO: improve this, it is inefficient?
	var str = unscaledValue(this).toString();
	return str.length - (str.charCodeAt(0) == 45 ? 1 : 0);
};

/**
 * @param {!BigDec} divisor
 * @return {!BigDec}
 */
BigDec.prototype.remainder = function(divisor) {
	return this.divideAndRemainder(divisor)[1];
};

/**
 * @return {number}
 */
BigDec.prototype.scale = function() {
	return getScale(this);
};

/**
 * @param {number} n
 * @return {!BigDec}
 */
BigDec.prototype.scaleByPowerOfTen = function(n) {
	return n == 0 ? this : new BigDec(unscaledValue(this), getScale(this) - n);
};

/**
 * @param {number} newScale
 * @param {!RoundingMode=} rm
 * @return {!BigDec}
 */
BigDec.prototype.setScale = function(newScale, rm) {
	var m = unscaledValue(this);
	var s = getScale(this);
	if (newScale == s) {
		return this;
	} else if (newScale > s) {
		return new BigDec(mulPow10(m, newScale - s), newScale);
	} else {
		rm = arguments.length >= 2 ? /** @type {!RoundingMode} */ (rm) : RoundingMode.UNNECESSARY;
		return divRM(m, pow10(s - newScale), newScale, rm);
	}
};

/**
 * @return {number}
 */
BigDec.prototype.shortValue = function() {
	return this.toBigInteger().shortValue();
};

/**
 * @return {number}
 */
BigDec.prototype.shortValueExact = function() {
	return numberExact(this, BI_SHORT_MIN, BI_SHORT_MAX);
};

/**
 * Returns -1 if this value is negative, 1 if positive, else 0 (if this is equal to zero).
 * @return {number}
 */
BigDec.prototype.signum = function() {
	return unscaledValue(this).signum();
};

/**
 * @return {!BigDec}
 */
BigDec.prototype.stripTrailingZeros = function() {
	var m = unscaledValue(this);
	if (isZero(m)) {
		return BD_0;
	}
	var s = getScale(this);
	while (1) {
		var t = m.divideAndRemainder(BI_10);
		if (hasRemainder(t)) {
			break;
		}
		--s;
		m = /** @type {!BigInteger} */ (t[0]);
	}
	return s == getScale(this) ? this : new BigDec(m, s);
};

/**
 * @param {!BigDec} subtrahend
 * @return {!BigDec}
 */
BigDec.prototype.subtract = function(subtrahend) {
	var m1 = unscaledValue(this);
	var m2 = unscaledValue(subtrahend);
	var s1 = getScale(this);
	var s2 = getScale(subtrahend);
	if (s2 > s1) {
		m1 = mulPow10(m1, s2 - s1);
	} else if (s1 > s2) {
		m2 = mulPow10(m2, s1 - s2);
	}
	return new BigDec(m1.subtract(m2), Math.max(s1, s2));
};

/**
 * @param {!BigDec} b
 * @param {boolean} exact
 * @return {!BigInteger}
 */
function toBigInt(b, exact) {
	var s = getScale(b);
	var m = unscaledValue(b);
	if (s == 0) {
		return m;
	} else if (s < 0) {
		return mulPow10(m, 0 - s);
	} else {
		if (!exact) {
			return m.divide(pow10(s));
		}
		var t = m.divideAndRemainder(pow10(s));
		if (hasRemainder(t)) {
			throw new Error("rounding required");
		}
		return /** @type {!BigInteger} */ (t[0]);
	}
}

/**
 * @return {!BigInteger}
 */
BigDec.prototype.toBigInteger = function() {
	return toBigInt(this, false);
};

/**
 * @return {!BigInteger}
 */
BigDec.prototype.toBigIntegerExact = function() {
	return toBigInt(this, true);
};

/**
 * @param {string} s
 * @param {number} n
 * @return {string}
 */
function repeat(s, n) {
	if (String.prototype.repeat) {
		return s.repeat(n);
	}
	var res = "";
	for (; n > 0; --n) {
		res += s;
	}
	return res;
}

/**
 * @param {string} s
 * @param {number} pos
 * @return {string}
 */
function insertDec(s, pos) {
	return s.substring(0, pos) + "." + s.substring(pos);
}

/**
 * @param {!BigDec} bd
 * @param {boolean} eng
 * @return {string}
 */
function toString(bd, eng) {
	// this function should return a result similar to Java's BigDecimal.toString()
	var m = unscaledValue(bd);
	var e = 0 - getScale(bd);
	var s = m.toString();
	if (e != 0) {
		var isneg = s.charAt(0) == "-";
		s = isneg ? s.substring(1) : s;

		var adjustedExp = e + s.length - 1;
		if (e < 0 && adjustedExp >= -6) {
			// convert to character form without exponent
			if (adjustedExp >= 0) {
				s = insertDec(s, s.length + e);
			} else {
				s = "0." + repeat("0", 0 - adjustedExp - 1) + s;
			}
			e = 0;
		} else if (eng) {
			// engineering-string: e must be multiple of 3 and only 1-3 digits allowed in front of decimal
			e = adjustedExp;
			var decPos = 1;
			if (isZero(m)) {
				while (e % 3 != 0) {
					s += "0";
					++e;
				}
			} else {
				while (e % 3 != 0) {
					if (decPos >= s.length) {
						s += "0";
					}
					++decPos;
					--e;
				}
			}
			if (decPos < s.length) {
				s = insertDec(s, decPos);
			}
		} else {
			// fall back to exponential notation
			e = adjustedExp;
			if (s.length > 1) {
				s = insertDec(s, 1);
			}
		}

		s = isneg ? "-" + s : s;
		if (e != 0) {
			s += (e > 0 ? "E+" : "E") + e.toString();
		}
	}
	return s;
}

/**
 * @return {string}
 */
BigDec.prototype.toEngineeringString = function() {
	return toString(this, true);
};

/**
 * @return {string}
 */
BigDec.prototype.toPlainString = function() {
	var m = unscaledValue(this);
	var e = 0 - getScale(this);
	if (isZero(m)) {
		return e < 0 ? "0." + repeat("0", 0 - e) : "0";
	}
	var str = m.toString();
	if (e >= 0) {
		str += repeat("0", e);
	} else {
		var isneg = str.charCodeAt(0) == 45;
		if (isneg) {
			str = str.substring(1);
		}
		var negch = isneg ? "-" : "";
		var decPos = str.length + e;
		if (decPos <= 0) {
			str = negch + "0." + repeat("0", 0 - decPos) + str;
		} else {
			str = negch + insertDec(str, decPos);
		}
	}
	return str;
};

/**
 * @return {string}
 * @override
 */
BigDec.prototype.toString = function() {
	return toString(this, false);
};

/**
 * @return {!BigDec}
 */
BigDec.prototype.ulp = function() {
	return new BigDec(BI_1, getScale(this));
};

/**
 * @return {!BigInteger}
 */
BigDec.prototype.unscaledValue = function() {
	return unscaledValue(this);
};

}());

