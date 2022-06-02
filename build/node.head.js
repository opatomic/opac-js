/**
 * @typedef {?Buffer}
 */
var OpaBuff;

/**
 * @param {string|!Uint8Array} str
 * @param {string=} encoding
 * @return {!Buffer}
 */
function nodeBufferFrom(str, encoding) {
	// eslint-disable-next-line n/no-deprecated-api
	return new Buffer(str, encoding);
}

// note: check for Buffer.allocUnsafe because Buffer.from is defined in earlier versions of node but not fully implemented
/**
 * @param {string|!Uint8Array} str
 * @param {string=} encoding
 * @return {!Buffer}
 */
var BUFFERFROM = (typeof Buffer.allocUnsafe == "function") ? Buffer.from : nodeBufferFrom;

/**
 * @param {number} len
 * @return {!Buffer}
 */
function nodeNewBuffer(len) {
	// eslint-disable-next-line n/no-deprecated-api
	return new Buffer(len);
}

// TODO: ok to use allocUnsafe here?
/**
 * @param {number} len
 * @return {!Buffer}
 */
var NEWBUF = (typeof Buffer.allocUnsafe == "function") ? Buffer.allocUnsafe : nodeNewBuffer;

/**
 * @param {string} s
 * @return {!Buffer}
 */
function STRENC(s) {
	return BUFFERFROM(s, "utf8");
}

/**
 * @param {!Buffer} b
 * @return {string}
 */
function STRDEC(b) {
	return b.toString("utf8");
}

/**
 * @param {!Function} cb
 * @return {null}
 */
function NEXTTICK(cb) {
	process.nextTick(cb);
	return null;
}

