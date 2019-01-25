"use strict";

var BigInteger = require("jsbn").BigInteger;

var NEWBUF = function(l) {
	// TODO: ok to use unsafe here?
	return Buffer.allocUnsafe(l);
}
var STRENC = function(s) {
	return Buffer.from(s, "utf-8");
}
var STRDEC = function(b) {
	return b.toString("utf-8");
}
var BTOA = function(v) {
	return Buffer.from(v).toString("base64");
}

