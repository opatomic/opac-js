"use strict";
const NEWBUF = function(l) {
	return new Uint8Array(l);
}
const ENCODER = new TextEncoder("utf-8");
const STRENC = function(s) {
	return ENCODER.encode(s);
}
const DECODER = new TextDecoder("utf-8");
const STRDEC = function(b) {
	return DECODER.decode(b);
}
const BTOA = window.btoa;

