"use strict";

/**
 * @param {number} l
 * @return {!Uint8Array}
 */
var NEWBUF = function(l) {
	return new Uint8Array(l);
}

var ENCODER = new TextEncoder("utf-8");

/**
 * @param {!string} s
 * @return {!Uint8Array}
 */
var STRENC = function(s) {
	return ENCODER.encode(s);
}

var DECODER = new TextDecoder("utf-8");

/**
 * @param {!Uint8Array} b
 * @return {!string}
 */
var STRDEC = function(b) {
	return DECODER.decode(b);
}

var NEXTTICK = function(cb) {
	return setTimeout(cb, 0);
}

