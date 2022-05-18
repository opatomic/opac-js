// These extern definitions may not include all types/possibilities. Some are adapted to just specify what is needed/used by opatomic-client.

/**
 * @param {string} path
 */
function require(path) {}

/**
 * @extends {Uint8Array}
 * @constructor
 * @param {number} size The desired length of the new Buffer
 * @param {!(string|number|Uint8Array|Buffer)=} fill A value to pre-fill the new Buffer with. Default: 0
 * @param {string=} encoding If fill is a string, this is its encoding. Default: 'utf8'.
 */
function Buffer(size, fill, encoding) {}

/**
 * @param {string} str
 * @param {string=} encoding
 * @return {!Buffer}
 */
Buffer.from = function(str, encoding) {}

/**
 * @param {number} size The desired length of the new Buffer
 * @return {!Buffer}
 */
Buffer.allocUnsafe = function(size) {}

var process;

/**
 * @param {!Function} cb
 * @param {...?} args
 * @return {void}
 */
process.prototype.nextTick = function(cb, args) {}

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

