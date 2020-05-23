"use strict";

var BigInteger = require("jsbn").BigInteger;

// note: check for Buffer.allocUnsafe because Buffer.from is defined in earlier versions of node but not fully implemented
var BUFFERFROM = (typeof Buffer.allocUnsafe == 'function') ? Buffer.from : function(a, b, c) {
	return new Buffer(a, b, c);
}

// TODO: ok to use allocUnsafe here?
var NEWBUF = (typeof Buffer.allocUnsafe == 'function') ? Buffer.allocUnsafe : function(len) {return new Buffer(len);};

var STRENC = function(s) {
	return BUFFERFROM(s, "utf8");
}
var STRDEC = function(b) {
	return b.toString("utf8");
}

var NEXTTICK = function(cb) {
	process.nextTick(cb);
	return null;
}

