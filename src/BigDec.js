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
			if (!Number.isSafeInteger(v.e)) {
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

/** @alias BigDec.prototype */
var P = BigDec.prototype;

/**
 * @return {!BigDec}
 */
P.abs = function() {
	return this.m.signum() < 0 ? new BigDec(this.m.abs(), this.e) : this;
}

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
P.add = function(b) {
	var r = nbd();
	add3(this, b, r);
	return r;
}

/**
 * @return {!BigDec}
 */
P.clone = function() {
	return new BigDec(this.m.clone(), this.e);
}

/**
 * @param {!BigDec} b
 * @return {number}
 */
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

/**
 * @param {!BigDec} r
 */
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

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
P.multiply = function(b) {
	var r = nbd();
	mul3(this, b, r);
	return r;
}

/**
 * Returns -1 if this value is negative, 1 if positive, else 0 (if this is equal to zero).
 * @return {number}
 */
P.signum = function() {
	return this.m.signum();
}

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
P.subtract = function(b) {
	var r = nbd();
	sub3(this, b, r);
	return r;
}

/**
 * @return {!string}
 */
P.toString = function() {
	// TODO: return same string that java returns
	var s = this.m.toString();
	if (this.e != 0) {
		s += "e" + this.e.toString();
	}
	return s;
}

}());

