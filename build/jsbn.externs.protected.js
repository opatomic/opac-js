/**
 * @externs
 */

/** @const @type {number} */
BigInteger.prototype.DB;
/** @const @type {number} */
BigInteger.prototype.DM;
/** @const @type {number} */
BigInteger.prototype.DV;
/** @type {number} */
BigInteger.prototype.s;
/** @type {number} */
BigInteger.prototype.t;

/**
 * @param {!BigInteger} a
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.addTo = function(a,r) {};

/**
 * @return {void}
 */
BigInteger.prototype.clamp = function() {};

/**
 * @return {!BigInteger}
 */
BigInteger.prototype.clone = function() {};

/**
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.copyTo = function(r) {};

/**
 * @param {!BigInteger} m
 * @param {BigInteger} q
 * @param {BigInteger} r
 * @return {void}
 */
BigInteger.prototype.divRemTo = function(m,q,r) {};

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

/**
 * @param {number} n
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.lShiftTo = function(n,r) {};

/**
 * @param {!BigInteger} a
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.multiplyTo = function(a,r) {};

/**
 * @param {number} n
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.rShiftTo = function(n,r) {};

/**
 * @param {!BigInteger} a
 * @param {!BigInteger} r
 * @return {void}
 */
BigInteger.prototype.subTo = function(a,r) {};

