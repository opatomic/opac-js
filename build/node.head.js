/**
 * @typedef {?Buffer}
 */
var OpaBuff;

// note: check for Buffer.allocUnsafe because Buffer.from is defined in earlier versions of node but not fully implemented
var BUFFERFROM = (typeof Buffer.allocUnsafe == 'function') ? Buffer.from : function(a, b, c) {
	return new Buffer(a, b, c);
}

// TODO: ok to use allocUnsafe here?
var NEWBUF = (typeof Buffer.allocUnsafe == 'function') ? Buffer.allocUnsafe : function(len) {return new Buffer(len);};

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

