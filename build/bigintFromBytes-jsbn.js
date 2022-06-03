/**
 * @param {!BigInteger} a
 * @param {!BigInteger} b
 * @return {!BigInteger}
 */
function bigIntNegateTo(a, b) {
	BigInteger.ZERO.subTo(a, b);
	return b;
}

/**
 * @param {bigint} v
 * @return {!BigInteger}
 */
function bigIntFromNativeBigInt(v) {
	return new BigInteger(v.toString(16), 16);
}

/**
 * @param {number} n
 * @return {!BigInteger}
 */
function bigIntFromNumber(n) {
	if (n < 0) {
		var posval = bigIntFromNumber(0 - n);
		return bigIntNegateTo(posval, posval);
	}
	if (n == 0) {
		return BigInteger.ZERO.clone();
	}
	if (!isSafeInteger(n)) {
		throw new Error("arg is not safe integer");
	}

	//return new BigInteger(n.toString(16), 16);

	var val = new BigInteger(null);
	val.s = 0;
	val.t = 1;
	val[0] = n & val.DM;
	n = Math.floor(n / val.DV);
	for (var i = 1; n > 0; ++i) {
		val[i] = n & val.DM;
		++val.t;
		n = Math.floor(n / val.DV);
	}
	return val;
}

/**
 * read a byte array in big-endian format
 * custom function similar to bnpFromString(s,256);
 * see also, java constructor: public BigInteger(int signum, byte[] magnitude)
 *   https://docs.oracle.com/javase/7/docs/api/java/math/BigInteger.html#BigInteger(int,%20byte[])
 * @param {boolean} neg
 * @param {!Uint8Array} b
 * @param {number} idx
 * @param {number} len
 * @return {!BigInteger}
 */
function bigIntFromBytes(neg, b, idx, len) {
	var r = new BigInteger(null);
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
	return neg ? bigIntNegateTo(r, r) : r;
}

