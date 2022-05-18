// define some jsbn BigInteger methods and properties
// note: this does not include all properties or methods (just what's needed)
//   also, some of these methods are actually supposed to be protected

/**
 * @constructor
 * @param {number|string|Array=} a
 * @param {number=} b
 * note: this does not match the actual implementation which also supports RNG params
 */
var BigInteger = function(a,b) {};

/**
 * @type {!BigInteger}
 * @const
 */
BigInteger.ZERO;
/** @const @type {number} */
BigInteger.prototype.DB;
/** @const @type {number} */
BigInteger.prototype.DM;
/** @const @type {number} */
BigInteger.prototype.DV;
/** @type {number} */
BigInteger.prototype.s;

/**
 * @return {void}
 */
BigInteger.prototype.clamp = function() {};

/** @return {!BigInteger} */
BigInteger.prototype.negate = function() {};

/**
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.copyTo = function(r) {};

/**
 * @param {!BigInteger} a
 * @return {number}
 */
BigInteger.prototype.compareTo = function(a) {};

/**
 * @param {!BigInteger} a
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.addTo = function(a,r) {};

/**
 * @param {!BigInteger} a
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.subTo = function(a,r) {};

/**
 * @param {!BigInteger} a
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.multiplyTo = function(a,r) {};

/**
 * @param {!BigInteger} m
 * @param {BigInteger} q
 * @param {BigInteger} r
 * @return {void}
 */
BigInteger.prototype.divRemTo = function(m,q,r) {};

/**
 * @param {number} n
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.lShiftTo = function(n,r) {};

/**
 * @param {number} n
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.rShiftTo = function(n,r) {};

/**
 * @return {!Array<number>}
 */
BigInteger.prototype.toByteArray = function() {};

/**
 * @param {number} n
 * @return {void}
 */
BigInteger.prototype.dMultiply = function(n) {};

/**
 * @param {number} x
 * @return {void}
 */
BigInteger.prototype.fromInt = function(x) {};

/** @return {number} */
BigInteger.prototype.intValue = function() {};
/** @return {number} */
BigInteger.prototype.byteValue = function() {};
/** @return {number} */
BigInteger.prototype.signum = function() {};
/** @return {number} */
BigInteger.prototype.bitLength = function() {};
/** @return {!BigInteger} */
BigInteger.prototype.abs = function() {};
/** @return {!BigInteger} */
BigInteger.prototype.clone = function() {};

