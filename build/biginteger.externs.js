/**
 * @externs
 */

/**
 * note: this does not match the actual implementation which also supports RNG params
 * @constructor
 * @param {number|string|Array=} a
 * @param {number=} b
 */
var BigInteger = function(a,b) {};

/**
 * @type {!BigInteger}
 * @const
 */
BigInteger.ZERO;

/**
 * @type {!BigInteger}
 * @const
 */
BigInteger.ONE;

/**
 * @return {!BigInteger}
 */
BigInteger.prototype.abs = function() {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.add = function(val) {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.and = function(val) {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.andNot = function(val) {};

/**
 * @return {number}
 */
BigInteger.prototype.bitCount = function() {};

/**
 * @return {number}
 */
BigInteger.prototype.bitLength = function() {};

/**
 * @return {number}
 */
BigInteger.prototype.byteValue = function() {};

/**
 * @param {number} n
 * @return {!BigInteger}
 */
BigInteger.prototype.clearBit = function(n) {};

/**
 * @param {!BigInteger} val
 * @return {number}
 */
BigInteger.prototype.compareTo = function(val) {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.divide = function(val) {};

/**
 * @param {!BigInteger} val
 * @return {!Array<BigInteger>}
 */
BigInteger.prototype.divideAndRemainder = function(val) {};

/**
 * @param {number} n
 * @return {!BigInteger}
 */
BigInteger.prototype.flipBit = function(n) {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.gcd = function(val) {};

/**
 * @return {!number}
 */
BigInteger.prototype.getLowestSetBit = function() {};

/**
 * @return {number}
 */
BigInteger.prototype.intValue = function() {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.max = function(val) {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.min = function(val) {};

/**
 * @param {!BigInteger} m
 * @return {!BigInteger}
 */
BigInteger.prototype.mod = function(m) {};

/**
 * @param {!BigInteger} m
 * @return {!BigInteger}
 */
BigInteger.prototype.modInverse = function(m) {};

/**
 * @param {!BigInteger} exponent
 * @param {!BigInteger} m
 * @return {!BigInteger}
 */
BigInteger.prototype.modPow = function(exponent, m) {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.multiply = function(val) {};

/**
 * @return {!BigInteger}
 */
BigInteger.prototype.negate = function() {};

/**
 * @return {!BigInteger}
 */
BigInteger.prototype.not = function() {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.or = function(val) {};

/**
 * @param {number} exponent
 * @return {!BigInteger}
 */
BigInteger.prototype.pow = function(exponent) {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.remainder = function(val) {};

/**
 * @param {number} n
 * @return {!BigInteger}
 */
BigInteger.prototype.setBit = function(n) {};

/**
 * @param {number} n
 * @return {!BigInteger}
 */
BigInteger.prototype.shiftLeft = function(n) {};

/**
 * @param {number} n
 * @return {!BigInteger}
 */
BigInteger.prototype.shiftRight = function(n) {};

/**
 * @return {number}
 */
BigInteger.prototype.shortValue = function() {};

/**
 * @return {number}
 */
BigInteger.prototype.signum = function() {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.subtract = function(val) {};

/**
 * @param {number} n
 * @return {boolean}
 */
BigInteger.prototype.testBit = function(n) {};

/**
 * @return {!Array<number>}
 */
BigInteger.prototype.toByteArray = function() {};

/**
 * @param {number=} radix
 * @return {string}
 * @override
 */
BigInteger.prototype.toString = function(radix) {};

/**
 * @param {!BigInteger} val
 * @return {!BigInteger}
 */
BigInteger.prototype.xor = function(val) {};

// TODO: the following methods could possibly be added above
//  equals
//  isProbablePrime
//  nextProbablePrime
//  static BigInteger probablePrime(int bitLength, Random rnd);

// The following methods from Java's java.math.BigInteger are not implemented in jsbn:
//  doubleValue()
//  floatValue()
//  hashCode()
//  longValue()
//  static BigInteger valueOf(long val);

