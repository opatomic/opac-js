"use strict";

/**
 * @param {number} l
 * @return {!Uint8Array}
 */
const NEWBUF = function(l) {
	return new Uint8Array(l);
}

const ENCODER = new TextEncoder("utf-8");

/**
 * @param {!string} s
 * @return {!Uint8Array}
 */
const STRENC = function(s) {
	return ENCODER.encode(s);
}

const DECODER = new TextDecoder("utf-8");

/**
 * @param {!Uint8Array} b
 * @return {!string}
 */
const STRDEC = function(b) {
	return DECODER.decode(b);
}

const BTOA = window.btoa;

