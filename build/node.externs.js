// These extern definitions may not include all types/possibilities. Some are adapted to just specify what is needed/used by opatomic-client.

/**
 * @param {string} path
 * @return {?}
 */
function require(path) {}

/**
 * @extends {Uint8Array}
 * @constructor
 * @param {number|string|!Uint8Array} p1
 * @param {string=} encoding - If p1 is a string, this is its encoding. Default: 'utf8'.
 */
function Buffer(p1, encoding) {}

/**
 * @param {string|!Uint8Array} fill
 * @param {string=} encoding - If fill is a string, this is its encoding. Default: 'utf8'.
 * @return {!Buffer}
 */
Buffer.from = function(fill, encoding) {}

/**
 * @param {number} size The desired length of the new Buffer
 * @return {!Buffer}
 */
Buffer.allocUnsafe = function(size) {}

/**
 * @param {string=} encoding
 * @return {string}
 * @override
 */
Buffer.prototype.toString = function(encoding) {};

/**
 * @const
 */
var process = {};

/**
 * @param {!Function} cb
 * @param {...?} args
 * @return {void}
 */
process.nextTick = function(cb, args) {}

/**
 * @const
 */
var net = {};

/**
 * @constructor
 */
net.Socket = function(){}

/**
 * @param {!Buffer} b
 * @return {boolean}
 */
net.Socket.prototype.write = function(b) {};

/**
 * @param {string} event
 * @param {function(...?): void} listener
 * @return {void}
 */
net.Socket.prototype.on = function(event, listener) {}

/**
 * @param {?=} err
 * @return {void}
 */
net.Socket.prototype.destroy = function(err) {}

