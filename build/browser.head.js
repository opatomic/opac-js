/**
 * @param {number} l
 * @return {!Uint8Array}
 */
function NEWBUF(l) {
	return new Uint8Array(l);
}

var ENCODER = new TextEncoder("utf-8");

/**
 * @param {!string} s
 * @return {!Uint8Array}
 */
function STRENC(s) {
	return ENCODER.encode(s);
}

var DECODER = new TextDecoder("utf-8");

/**
 * @param {!Uint8Array} b
 * @return {!string}
 */
function STRDEC(b) {
	return DECODER.decode(b);
}

function NEXTTICK(cb) {
	return setTimeout(cb, 0);
}

