"use strict";

var LIB_BIG_DEC = null;
var LIB_BIG_INT = null;
var OUT = null;

var TestBigDecimal = {};

TestBigDecimal.initLibs = function(l1, l2) {
	LIB_BIG_DEC = l1;
	LIB_BIG_INT = l2;
}

function objToString(obj) {
	var t = typeof obj;
	if (t == "number" && Number.isSafeInteger(obj)) {
		return "n," + obj.toString();
	} else if (t == "string") {
		return "s," + obj;
	} else if (t == "boolean") {
		return obj.toString();
	} else if (t == "object") {
		if (Array.isArray(obj)) {
			var res = "[";
			for (var i = 0; i < obj.length; ++i) {
				if (i != 0) {
					res += ",";
				}
				res += objToString(obj[i]);
			}
			return res + "]";
		} else if (obj instanceof LIB_BIG_DEC) {
			return "BigDec," + obj.unscaledValue().toString() + "," + obj.scale().toString();
		} else if (obj instanceof LIB_BIG_INT) {
			return "BigInt," + obj.toString();
		} else if (obj.constructor.name == "BigInteger") {
			return "BigInt," + obj.toString();
		} else if (obj instanceof Error) {
			return "E";
		} else {
			throw new Error("unknown object");
		}
	} else {
		throw new Error("unsupported type " + t);
	}
}

function logResult(res) {
	var str = objToString(res);
	if (OUT) {
		OUT.write(str + "\n");
	}
}

function callAndLog(func, thisObj, args) {
	var res;
	try {
		var res = thisObj[func].apply(thisObj, args);
	} catch (e) {
		res = e;
	}
	logResult(res);
}

function callFunc(func, thisObj, args) {
	var argsAsStr = args.map(function(x) {
		return objToString(x);
	});
	if (OUT) {
		OUT.write(func + (thisObj ? " " + objToString(thisObj) : "" ) + " " + argsAsStr.join(" ") + "\n");
	}
	callAndLog(func, thisObj, args);
}




var FUNCS_BI_0 = ["abs", "bitCount", "bitLength", "byteValue", "getLowestSetBit", "intValue", "negate", "not", "shortValue", "signum", "toByteArray", "toString"];
var FUNCS_BI1 = ["add", "and", "andNot", "compareTo", "divide", "divideAndRemainder", "gcd", "max", "min", "mod", /*"modInverse",*/ "multiply", "or", "remainder", "subtract", "xor"];

function runTestsSoloBI(v) {
	callFuncs(FUNCS_BI_0, v, []);
	var bitLen = v.bitLength();
	for (var i = -1; i <= bitLen + 2; ++i) {
		callFunc("clearBit", v, [i]);
		callFunc("flipBit", v, [i]);
		callFunc("setBit", v, [i]);
		callFunc("testBit", v, [i]);
	}
	for (var i = -4; i <= 4; ++i) {
		callFunc("shiftLeft", v, [i]);
		callFunc("shiftRight", v, [i]);
		callFunc("pow", v, [i]);
	}
	for (var i = 2; i <= 36; ++i) {
		callFunc("toString", v, [i]);
	}
}

function runTestsPairBI(v1, v2) {
	callFuncs(FUNCS_BI1, v1, [v2]);
	callFuncs(FUNCS_BI1, v2, [v1]);
}

function runTests2BI(v1, v2) {
	runTestsPairBI(v1, v2);
	runTestsPairBI(v1, v2.negate());
	runTestsPairBI(v1.negate(), v2);
	runTestsPairBI(v1.negate(), v2.negate());
}





TestBigDecimal.runTestsBI = function(dst) {
	OUT = dst;

	var vals = ["0",
		"0.01234", "0.1234", "1", "-1.234", "10", "1000", "123.000", "+1230e-121", "123.000e2", "123.456", "1e-1", "1e-2", "1e-3", "1e1", "1e2", "1e3",
		"85", "8765", "95", "10",
		"9007199254740991", "9223372036854775807", "9223372036854775808", "9223372036854775809", "12345678901234567890123456789012345678901234567890",
		"12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890"];
	for (var i = 0; i < vals.length; ++i) {
		var bi = new LIB_BIG_INT(new LIB_BIG_DEC(vals[i]).toBigInteger().toString());
		runTestsSoloBI(bi);
		runTestsSoloBI(bi.negate());
		for (var j = 0; j < vals.length; ++j) {
			var bi2 = new LIB_BIG_INT(new LIB_BIG_DEC(vals[j]).toBigInteger().toString());
			runTests2BI(bi, bi2);
		}
	}
}






var FUNCS_0 = ["abs", "byteValue", "byteValueExact", "intValue", "intValueExact", "negate", "precision", "shortValue", "shortValueExact", "signum", "stripTrailingZeros", "toBigInteger", "toBigIntegerExact", "toEngineeringString", "toPlainString", "toString", "ulp"];
var FUNCS_int = ["movePointLeft", "movePointRight", "pow", "scaleByPowerOfTen"];
var FUNCS_BD1 = ["add", "compareTo", "divide", "divideAndRemainder", "divideToIntegralValue", "equals", "max", "min", "multiply", "remainder", "subtract"];

function callDivide(thisObj, args) {
	for (var j = 0; j < 8; ++j) {
		callFunc("divide", thisObj, args.concat([j]));
	}
}

function callFuncs(funcs, thisObj, args) {
	for (var i = 0; i < funcs.length; ++i) {
		if (funcs[i] == "divide" && thisObj.scale) {
			callDivide(thisObj, args);
			for (var j = -3; j <= 3; ++j) {
				callDivide(thisObj, args.concat([thisObj.scale() + j]));
			}
		}
		callFunc(funcs[i], thisObj, args);
	}
}

function runTestsSolo(bd) {
	callFuncs(FUNCS_0, bd, []);
	for (var i = -3; i < 3; ++i) {
		callFuncs(FUNCS_int, bd, [i]);
		callFunc("setScale", bd, [bd.scale() + i]);
		for (var j = 0; j < 8; ++j) {
			callFunc("setScale", bd, [bd.scale() + i, j]);
		}
	}
}

function runTestsPair(bd1, bd2) {
	callFuncs(FUNCS_BD1, bd1, [bd2]);
	callFuncs(FUNCS_BD1, bd2, [bd1]);
}

function runTests2(bd1, bd2) {
	runTestsPair(bd1, bd2);
	runTestsPair(bd1, bd2.negate());
	runTestsPair(bd1.negate(), bd2);
	runTestsPair(bd1.negate(), bd2.negate());
}

TestBigDecimal.runTestsBD = function(dst) {
	OUT = dst;

	// TODO: test overflow of BigDecimal scale/exponent

	var vals = ["0", "0e3", "0e-3", "0e6", "0e-6", "0e7", "0e-7", "0e8", "0e-8", "0e9", "0e-9", "0E+45", "0e-45",
		"0.01234", "0.1234", "1", "-1.234", "10", "1000", "123.000", "+1230e-121", "1230e121", "123.000e2", "123.456", "1e-1", "1e-2", "1e-3", "1e1", "1e2", "1e3",
		"85", "8765", "95", "10",
		"9007199254740991", "9223372036854775807", "9223372036854775808", "9223372036854775809", "12345678901234567890123456789012345678901234567890",
		"12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890e12"];
	for (var i = 0; i < vals.length; ++i) {
		var v1 = new LIB_BIG_DEC(vals[i]);
		runTestsSolo(v1);
		runTestsSolo(v1.negate());
		for (var j = 0; j < vals.length; ++j) {
			var v2 = new LIB_BIG_DEC(vals[j]);
			runTests2(v1, v2);
		}
	}
}


module.exports = TestBigDecimal;

