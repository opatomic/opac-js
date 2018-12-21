"use strict";

const Deque = require("double-ended-queue");
const BigInteger = require("jsbn").BigInteger;

const NEWBUF = function(l) {
	// TODO: ok to use unsafe here?
	return Buffer.allocUnsafe(l);
}
const STRENC = function(s) {
	return Buffer.from(s, "utf-8");
}
const STRDEC = function(b) {
	return b.toString("utf-8");
}
const BTOA = function(v) {
	return Buffer.from(v).toString("base64");
}

