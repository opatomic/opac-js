var libfs = require("fs");
var libopac = require("./opac.node.js");
var libTestBigDecimal = require("./TestBigDecimal.js");

function wrapThrowIfZero(lib, func) {
	var origFunc = lib[func];
	lib[func] = function(v) {
		if (v.signum() == 0) {
			throw new Error("cannot divide by 0");
		}
		return origFunc.apply(this, [v]);
	};
}

function wrapThrowIfNeg(lib, func) {
	var origFunc = lib[func];
	lib[func] = function(n) {
		if (n < 0) {
			throw new Error("n is negative");
		}
		return origFunc.apply(this, [n]);
	};
}

function correctJsbnMethods(libJsbn) {
	var origCompareTo = libJsbn.prototype.compareTo;
	libJsbn.prototype.compareTo = function(v) {
		// compareTo should only return -1, 0, or 1
		var res = origCompareTo.apply(this, arguments);
		return res > 0 ? 1 : (res < 0 ? -1 : 0);
	}

	wrapThrowIfZero(libJsbn.prototype, "divide");
	wrapThrowIfZero(libJsbn.prototype, "divideAndRemainder");
	wrapThrowIfZero(libJsbn.prototype, "remainder");

	wrapThrowIfNeg(libJsbn.prototype, "clearBit");
	wrapThrowIfNeg(libJsbn.prototype, "flipBit");
	wrapThrowIfNeg(libJsbn.prototype, "pow");
	wrapThrowIfNeg(libJsbn.prototype, "setBit");
	wrapThrowIfNeg(libJsbn.prototype, "testBit");

	var origMod = libJsbn.prototype.mod;
	libJsbn.prototype.mod = function(v) {
		if (v.signum() <= 0) {
			throw new Error("m <= 0");
		}
		return origMod.apply(this, [v]);
	}
}

correctJsbnMethods(libopac.BigInteger);
libTestBigDecimal.initLibs(libopac.BigDec, libopac.BigInteger);

libTestBigDecimal.runTestsBD(libfs.createWriteStream("node.bigdec.out.txt"));
libTestBigDecimal.runTestsBI(libfs.createWriteStream("node.bigint.out.txt"));
