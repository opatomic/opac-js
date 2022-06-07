/*
 * Copyright 2018-2019 Opatomic
 * Open sourced with ISC license. Refer to LICENSE for details.
 */

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
 * @param {?BigInteger|string} man
 * @param {number=} exp
 */
function BigDec(man, exp) {
	/**
	 * @ignore
	 * @param {!BigDec} v
	 * @param {string} s
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
			// ignore "+" char immediately following e/E
			var skipLen = s.charCodeAt(epos + 1) == 43 ? 2 : 1;
			v.m = new BigInteger(s.substring(0, epos));
			v.e = parseInt(s.substring(epos + skipLen), 10);
			if (!isSafeInteger(v.e)) {
				throw new Error("number string \"" + s + "\" cannot be parsed");
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

(function() {

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
		throw new Error("invalid extension. must be >= 0");
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
 * @param {!BigDec} src
 * @param {!BigDec} dst
 */
function copyTo(src, dst) {
	src.m.copyTo(dst.m);
	dst.e = src.e;
}

/**
 * r = a + b
 * @param {!BigDec} a
 * @param {!BigDec} b
 * @param {!BigDec} r
 */
function add3(a, b, r) {
	if (b.signum() == 0) {
		copyTo(a, r);
	} else if (a.signum() == 0) {
		copyTo(b, r);
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
		copyTo(a, r);
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
		copyTo(tmp, r);
	} else if (a.signum() == 0) {
		copyTo(a, r);
	} else if (b.signum() == 0) {
		copyTo(b, r);
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
 * @param {?BigDec} q
 * @param {?BigDec} r
 */
function div(a, b, q, r) {
	var tmp;
	if (a == r || b == r) {
		tmp = r.clone();
		div(a, b, q, tmp);
		copyTo(tmp, r);
	} else if (a == q || b == q) {
		tmp = q.clone();
		div(a, b, tmp, r);
		copyTo(tmp, q);
	} else if (b.signum() == 0) {
		// TODO: use NaN?
		// actually, can probably define x/0 to be 0. see https://www.hillelwayne.com/post/divide-by-zero/
		throw new Error("cannot divide by 0");
	} else if (a.signum() == 0) {
		if (q) {
			copyTo(a, q);
		}
		if (r) {
			copyTo(a, r);
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
			r.e = a.e;
		}
	}
}

/**
 * @return {!BigDec}
 */
BigDec.prototype.abs = function() {
	return this.m.signum() < 0 ? new BigDec(this.m.abs(), this.e) : this;
};

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
BigDec.prototype.add = function(b) {
	var r = nbd();
	add3(this, b, r);
	return r;
};

/**
 * @return {!BigDec}
 */
BigDec.prototype.clone = function() {
	return new BigDec(this.m.clone(), this.e);
};

/**
 * @param {!BigDec} b
 * @return {number}
 */
BigDec.prototype.compareTo = function(b) {
	if (this.m.signum() < 0) {
		if (b.m.signum() >= 0) {
			return -1;
		}
	} else if (b.m.signum() < 0) {
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
};

/**
 * @param {!BigDec} divisor
 * @return {!Array<!BigDec>}
 */
BigDec.prototype.divideAndRemainder = function(divisor) {
	var q = nbd();
	var r = nbd();
	div(this, divisor, q, r);
	return [q, r];
};

/*
BigDec.prototype.equals = function(b) {
	return this.compareTo(b) == 0;
};

BigDec.prototype.max = function(b) {
	return this.compareTo(b) > 0 ? this : b;
};

BigDec.prototype.min = function(b) {
	return this.compareTo(b) < 0 ? this : b;
};
*/

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
BigDec.prototype.multiply = function(b) {
	var r = nbd();
	mul3(this, b, r);
	return r;
};

/**
 * Returns -1 if this value is negative, 1 if positive, else 0 (if this is equal to zero).
 * @return {number}
 */
BigDec.prototype.signum = function() {
	return this.m.signum();
};

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
BigDec.prototype.subtract = function(b) {
	var r = nbd();
	sub3(this, b, r);
	return r;
};

/**
 * @return {string}
 * @override
 */
BigDec.prototype.toString = function() {
	// this function should return a result similar to Java's BigDecimal.toString()
	var s = this.m.toString();
	var e = this.e;
	if (e != 0) {
		var isneg = s.charAt(0) == "-";
		s = isneg ? s.substring(1) : s;

		// try to add some 0's to beginning or end of significand
		// TODO: configurable numbers for max 0's to append/prepend?
		//   for now, it's set to 5 for both append/prepend
		if (e > 0) {
			if (e <= 5) {
				for (; e > 0; --e) {
					s += "0";
				}
			}
		} else if (s.length + e >= -5) {
			while (s.length + e <= 0) {
				s = "0" + s;
			}
			var idx = s.length + e;
			s = s.substring(0, idx) + "." + s.substring(idx);
			e = 0;
		}

		if (e != 0 && s.length > 1) {
			// wasn't able to add 0's to beginning or end;
			// fall back to scientific notation
			e += s.length - 1;
			s = s.substring(0, 1) + "." + s.substring(1);
		}

		s = isneg ? "-" + s : s;
		if (e != 0) {
			s += "e" + e.toString();
		}
	}
	return s;
};

}());

