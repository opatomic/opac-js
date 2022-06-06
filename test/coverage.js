// npm install --save-dev c8 jsbn big.js
// npx c8 -r html node coverage.js
//   coverage report will be in "coverage" directory

//Map = undefined;
var libopac = require("./opac.node.js");
var BigInteger = require("jsbn").BigInteger;
//var BigInteger = libopac.BigInteger;
var BigDec = libopac.BigDec;



function OpaByteArrayOutputStream(size) {
	this.mTmpBuff = new Uint8Array(1);
	this.mBuff = new Uint8Array(size ? size : 256);
	this.mLen = 0;
}
var P = OpaByteArrayOutputStream.prototype;

P.write = function(b) {
	// TODO: check type of argument
	if (!b) {
		return;
	}
	if (this.mLen + b.length > this.mBuff.length) {
		var newSize = this.mBuff.length * 2;
		while (newSize < this.mLen + b.length) {
			newSize = newSize * 2;
		}
		var newBuff = new Uint8Array(newSize);
		newBuff.set(this.mBuff);
		this.mBuff = newBuff;
	}
	this.mBuff.set(b, this.mLen);
	this.mLen += b.length;
}

P.write1 = function(v) {
	this.mTmpBuff[0] = v;
	this.write(this.mTmpBuff);
}

P.toByteArray = function() {
	return this.mBuff.subarray(0, this.mLen);
}



function opaCompare(o1, o2) {
	var t1 = libopac.opaType(o1);
	var t2 = libopac.opaType(o2);
	switch (t1) {
		case 'undefined':
			if (t2 == 'undefined') {
				return 0;
			}
			return -1;
		case 'null':
			if (t2 == 'undefined') {
				return 1;
			} else if (t2 == 'null') {
				return 0;
			}
			return -1;
		case 'boolean':
			if (t2 == 'undefined' || t2 == 'null') {
				return 1;
			} else if (t2 == 'boolean') {
				return o1 === o2 ? 0 : (o2 ? -1 : 1);
			}
			return -1;
		case 'number':
			if (t2 == 'number') {
				if (o1 < o2) {
					return -1;
				}
				return o1 == o2 ? 0 : 1;
			} else if (t2 == 'undefined' || t2 == 'null' || t2 == 'boolean') {
				return 1;
			}
			// fall thru
		case 'bigint':
		case 'BigInteger':
			return opaCompare(new BigDec(o1.toString()), o2);
		case "BigDec":
			if (t2 == 'BigDec') {
				return o1.compareTo(o2);
			} else if (t2 == 'number' || t2 == 'BigInteger' || t2 == 'bigint') {
				return o1.compareTo(new BigDec(o2.toString()));
			} else if (t2 == 'undefined' || t2 == 'null' || t2 == 'boolean') {
				return 1;
			}
			return -1;
		case 'Buffer':
		case 'Uint8Array':
			if (t2 == 'Uint8Array' || t2 == 'Buffer') {
				var minLen = Math.min(o1.byteLength, o2.byteLength);
				for (var i = 0; i < minLen; ++i) {
					if (o1[i] !== o2[i]) {
						return o1[i] < o2[i] ? -1 : 1;
					}
				}
				return o1.byteLength - o2.byteLength;
			} else if (t2 == 'string' || t2 == 'Array') {
				return -1;
			}
			return 1;
		case 'string':
			if (t2 == 'string') {
				// TODO: is this correct?
				return o1.localeCompare(o2);
			} else if (t2 == 'Array') {
				return -1;
			}
			return 1;
		case 'Array':
			if (t2 == 'Array') {
				var imin = Math.min(o1.length, o2.length);
				for (var i = 0; i < imin; ++i) {
					var cmp = opaCompare(o1[i], o2[i]);
					if (cmp != 0) {
						return cmp;
					}
				}
				return o1.length == o2.length ? 0 : (o1.length < o2.length ? -1 : 1);
			} else {
				return 1;
			}
	}
	if (o1 === libopac.OpaDef.SORTMAX_OBJ) {
		return o2 === o1 ? 0 : 1;
	}
	throw "unhandled case in switch";
}

function opaRpcEncode(val) {
	var out = new OpaByteArrayOutputStream();
	var s = new libopac.Serializer(out);
	s.writeObject(val);
	s.flush();
	return out.toByteArray();
}

function checkObjsEqual(o1, o2) {
	if (opaCompare(o1, o2) != 0) {
		throw "error: objects not equal " + libopac.stringify(o1) + " != " + libopac.stringify(o2);
	}
}

function opaTestParseObj(o) {
	o = [o];
	try {
		var bytes = opaRpcEncode(o);
		var pp = new libopac.PartialParser();
		var b = new libopac.PartialParser.Buff();
		b.len = 1;
		b.data = bytes;
		for (var i = 0; i < bytes.length; ++i) {
			b.idx = i;
			b.len = 1;
			//b[0] = bytes[i];
			var check = pp.parseNext(b);
			if (check != null) {
				if (i != bytes.length - 1) {
					throw "finish parse early";
				}
				checkObjsEqual(o, check);
			} else {
				if (i == bytes.length - 1) {
					throw "obj not parsed";
				}
			}
		}
		//console.log("success " + bytes[1] + " " + JSON.stringify(o));
	} catch (e) {
		console.log("error: ");
		console.log(e);
		console.log(o);
		//console.log("error " + e + " " + JSON.stringify(o));
	}
}

function opaTestSerializeString(val) {
	var out = new OpaByteArrayOutputStream();
	var s = new libopac.Serializer(out);
	s.writeString(val);
	s.flush();
	return out.toByteArray();
}

var BufferFrom = typeof Buffer.alloc == 'function' ? Buffer.from : function(a, b, c) {
	return new Buffer(a, b, c);
}
var MAX_SAFE_INTEGER =  9007199254740991;
var MIN_SAFE_INTEGER = 0 - MAX_SAFE_INTEGER;


var longStr = "";
for (var i = 0; i < 1024; ++i) {
	longStr += "longstring";
}
// TODO: long string with lots of different utf-8 encodings

var objs = [ undefined, null, false, true, libopac.OpaDef.SORTMAX_OBJ,
	[], [[]], ["howdy", 0, null, [false, true, [undefined]]],
	"", BufferFrom(""),
	"Hello World!", BufferFrom("Hello World!"), longStr, BufferFrom(longStr),
	-Infinity, Infinity, 0, -1, 1,
	MIN_SAFE_INTEGER, MAX_SAFE_INTEGER,
	BigInt(0), BigInt(-1), BigInt(1),
	BigInt("1234567890"), BigInt("-1234567890"),
	BigInt("9223372036854775807"), BigInt("-9223372036854775807"),
	BigInt("1234567890123456789012345678901234567890"), BigInt("-1234567890123456789012345678901234567890"),
	new BigInteger("9223372036854775807"), new BigInteger("-9223372036854775807"), 
	new BigInteger("1234567890123456789012345678901234567890"), new BigInteger("-1234567890123456789012345678901234567890"),
	new BigDec("0"), new BigDec("-1"), new BigDec("1"), new BigDec("-1e1"), new BigDec("1e1"), new BigDec("-1e-1"), new BigDec("1e-1"),
	new BigDec("123.456"), new BigDec("-123.456"), new BigDec("123.456e55"), new BigDec("-123.456e55"), new BigDec("123.456e-55"), new BigDec("-123.456e-55"),
	new BigDec("1234567890123456789012345678901234567890e9"), new BigDec("-1234567890123456789012345678901234567890e9"),
	new BigDec("1234567890123456789012345678901234567890e-9"), new BigDec("-1234567890123456789012345678901234567890e-9"),
];

for (var i = 0; i < objs.length; ++i) {
	opaTestParseObj(objs[i]);
}


var badSurrStr = {};
badSurrStr.length = 1;
badSurrStr.charCodeAt = function() {
	return 0xD801;
}
var bytes = opaTestSerializeString(badSurrStr);
if (opaCompare(bytes, BufferFrom([libopac.OpaDef.STRLPVI, 3, 0xEF, 0xBF, 0xBD])) != 0) {
	console.log("badSurrStr invalid");
	console.log(bytes);
}



function testStringify(obj, indent, expect) {
	if (libopac.stringify(obj, indent) != expect) {
		console.log("stringify incorrect:");
		console.log(libopac.stringify(obj, indent));
	}
}
testStringify(["str", 0], 2, "[\n  \"str\",\n  0\n]");
testStringify(["str", 0, [1, 2]], "\t", "[\n\t\"str\",\n\t0,\n\t[\n\t\t1,\n\t\t2\n\t]\n]");
testStringify(libopac.OpaDef.SORTMAX_OBJ, null, "SORTMAX");



function testExpectException(obj, cb, args, message) {
	try {
		cb.apply(obj, args);
		console.log("error: exception did not occur when expected for " + message);
	} catch (e) {
		if (!(e instanceof Error)) {
			console.log("caught an exception that's not instanceof Error");
		}
		console.log("success: exception caught for: " + message);
		//console.log(e);
	}
}
checkObjsEqual(libopac.opaType({}), "object");
//checkObjsEqual(libopac.opaType(new Uint8Array(0)), "Uint8Array");
checkObjsEqual(libopac.stringify(new Uint8Array(0)), "''");
//testExpectException(null, libopac.stringify, [function(){}], "stringify: function");
testExpectException(null, libopac.opaType, [function(){}], "opaType function");
testExpectException(null, libopac.opaType, [Symbol()], "opaType symbol");
testExpectException(null, libopac.Serializer, [null, 1], "new Serializer with buffer that's too small");
testExpectException(new libopac.Serializer(), libopac.Serializer.prototype.writeObject, [NaN], "serialize NaN");
testExpectException(new libopac.Serializer(), libopac.Serializer.prototype.writeObject, [{}], "serialize object");
testExpectException(new libopac.Serializer(), libopac.Serializer.prototype.writeObject, [function(){}], "serialize function");
testExpectException(new libopac.Serializer(), libopac.Serializer.prototype.writeNumber, ["notanumber"], "writeNumber passed non-number param");
testExpectException(null, libopac.BigDec, [Infinity], "BigDec non-finite arg");

// TODO: add test for serializing -0


function parseInvalidBytes(b, msg) {
	var p = new libopac.PartialParser();
	var pbuff = new libopac.PartialParser.Buff();
	pbuff.data = b;
	pbuff.idx = 0;
	pbuff.len = b.length;
	testExpectException(p, p.parseNext, [pbuff], msg);
	//p.parseNext(pbuff);
}

parseInvalidBytes([libopac.OpaDef.ARRAYEND], "PartialParser: end array token when not in array");
parseInvalidBytes([1], "PartialParser: invalid token type char");
parseInvalidBytes([libopac.OpaDef.ZERO], "PartialParser: no array container");


function testClientParseError(b, msg) {
	var nullWriter = {
		invoked: false,
		close: function(){this.invoked = true},
		flush: function(){},
		write: function(){}
	}
	var cc = {
		invoked: false,
		err: null,
		clientErrorHandler: function(e){this.invoked = true; this.err = e}
	}
	var client = new libopac.EventClient(nullWriter, cc);
	client.onRecv(b);
	var status = nullWriter.invoked && cc.invoked ? "success" : "failure";
	console.log(status + ": " + msg);
	//console.log(cc.err);
}
testClientParseError([1], "parse error triggered close/clientErrorHandler");
testClientParseError([libopac.OpaDef.ARRAYSTART, libopac.OpaDef.ZERO, libopac.OpaDef.ARRAYEND], "response array too small");
testClientParseError([libopac.OpaDef.ARRAYSTART, libopac.OpaDef.ZERO, libopac.OpaDef.ZERO, libopac.OpaDef.ZERO, libopac.OpaDef.ZERO, libopac.OpaDef.ARRAYEND], "response array too big");
testClientParseError([libopac.OpaDef.ARRAYSTART, libopac.OpaDef.NULL, libopac.OpaDef.ZERO, libopac.OpaDef.ARRAYEND], "extraneous null-async-id response");

function testFlushErr() {
	var nullWriter = {
		invoked: false,
		close: function(){this.invoked = true},
		flush: function(){throw new Error("test throw in flush")},
		write: function(){}
	}
	var cc = {
		invoked: false,
		err: null,
		clientErrorHandler: function(e){this.invoked = true; this.err = e}
	}
	var client = new libopac.EventClient(nullWriter, cc);
	client.call("PING");
	client.flush();
	var status = nullWriter.invoked && cc.invoked ? "success" : "failure";
	console.log(status + ": EventClient handle flush exception");
	//console.log(cc.err);
}

testFlushErr();


var libbig = require("big.js");
var numStrs = [
	"0", "1", "123e45", "9223372036854775807", "2147483647", MAX_SAFE_INTEGER.toString()
];
var nums1 = [];
var nums2 = [];

var zero1 = new BigDec("0");
var zero2 = new libbig("0");

for (var i = 0; i < numStrs.length; ++i) {
	var tmp1 = new BigDec(numStrs[i]);
	var tmp2 = new libbig(numStrs[i]);
	nums1.push(tmp1);
	nums2.push(tmp2);
	if (tmp1.signum() != 0) {
		nums1.push(zero1.subtract(tmp1));
		nums2.push(zero2.minus(tmp2));
	}
	if (tmp1.e != 0) {
		tmp1 = tmp1.clone();
		tmp1.e = 0 - tmp1.e;
		tmp2 = new libbig(tmp1.toString());
		nums1.push(tmp1);
		nums2.push(tmp2);
		nums1.push(zero1.subtract(tmp1));
		nums2.push(zero2.minus(tmp2));
	}
}

function bdcheck(res1, res2) {
	if (!res2.eq(libbig(res1.toString())) || res1.compareTo(new BigDec(res2.toString())) != 0) {
		console.log("err: " + res1.toString() + "!=" + res2.toString());
	}
}

for (var i = 0; i < nums1.length; ++i) {
	var bd1 = nums1[i];
	var bd2 = nums2[i];
	bdcheck(bd1.abs(), bd2.abs());
	for (var j = 0; j < nums1.length; ++j) {
		var bd3 = nums1[j];
		var bd4 = nums2[j];

		bdcheck(bd1.add(bd3), bd2.add(bd4));
		bdcheck(bd1.subtract(bd3), bd2.sub(bd4));
		bdcheck(bd1.multiply(bd3), bd2.mul(bd4));

		if (bd3.signum() != 0) {
			var qandr = bd1.divideAndRemainder(bd3);
			bdcheck(qandr[0], bd2.div(bd4).round(0, libbig.roundDown));
			bdcheck(qandr[1], bd2.mod(bd4));
		}

		var cmp1 = bd1.compareTo(bd3);
		var cmp2 = bd2.cmp(bd4);
		if ((cmp1 < 0 && cmp2 >= 0) || (cmp1 == 0 && cmp2 != 0) || (cmp1 > 0 && cmp2 <= 0)) {
			console.log("err: cmp differs");
		}
	}
}


// TODO: embed an array of strings rather than loading from file
var libfs = require("fs");
var lines = libfs.readFileSync("UTF-8-test.txt").toString().split("\n");
for (var i = 0; i < lines.length; ++i) {
	opaTestParseObj(lines[i]);
}








var libnet = require("net");

function echoResult(err, result) {
	if (err) {
		console.log("ERROR: " + libopac.stringify(err));
	} else {
		console.log("SUCCESS: " + libopac.opaType(result) + " " + libopac.stringify(result));
	}
}

function runTest(c) {
	//var c = libopac.newClient(s);
	var binobj = BufferFrom("hello", "utf-8");

	//console.log("s.writableHighWaterMark: " + s.writableHighWaterMark);
	//console.log("s.writableLength: " + s.writableLength);
	var binobj2 = Buffer.alloc(128);
	for (var i = 0; i < 128; ++i) {
		binobj2[i] = i;
	}

	c.call("PING", null, echoResult);
	c.call("ECHO", ["hello"], echoResult);
	c.call("ECHO", [0], echoResult);
	c.call("ECHO", [1], echoResult);
	c.call("ECHO", [new BigInteger("1")], echoResult);
	c.call("ECHO", [new BigInteger("2147483647")], echoResult);
	c.call("ECHO", [Math.pow(2,49) - 1], echoResult);
	c.call("ECHO", [MAX_SAFE_INTEGER], echoResult);
	c.call("ECHO", [new BigInteger(MAX_SAFE_INTEGER.toString())], echoResult);
	//c.call("ECHO", [Big("28374987238497327498273487238424")], echoResult);
	c.call("ECHO", [new BigInteger("28374987238497327498273487238424")], echoResult);
	c.call("ECHO", [new BigDec("28374987238497327498273487238424")], echoResult);
	c.call("ECHO", [new BigDec("28374987238497327498273487238424e-34")], echoResult);
	c.call("ECHO", [new BigDec("1234e5")], echoResult);
	//c.call("ECHO", [Big("1.23e-3")], echoResult);
	c.call("ECHO", [[undefined,null,false,true,-1,0,87687,new BigDec("-1.234e-450"),1.23,"str",[],[8762487264], binobj]], echoResult);
	c.call("ECHO", [["", BufferFrom("", "utf-8")]], echoResult);
	c.call("ECHO", [binobj2], echoResult);
	c.call("ECHO", [[-Infinity, Infinity, BigInt("28374987238497327498273487238424"), BigInt(0), BigInt("2147483647"), BigInt("-2147483647")]], echoResult);
	c.call("ECHO", [[BigInt("9007199254740992"), BigInt("-9007199254740992")]], echoResult);
	c.call("ECHO", [[BigInt("28374987238497327498273487238424"), BigInt("-28374987238497327498273487238424")]], echoResult);
	c.call("ECHO", [[new BigDec("123e456"),new BigDec("123e-456"),new BigDec("-123e456"),new BigDec("-123e-456")]], echoResult);
	c.callA("ECHO", ["testing async callback id"], echoResult);
	c.call("ECHO", [-1.23], echoResult);

	c.call("PING", null, function(err, result) {
		console.log("testing throw from callback");
		throw "testing throw from callback";
	});

	c.registerCB("testID", function(err, result) {
		if (err) {
			console.log("Error: " + err);
		} else {
			console.log("SUCCESS: " + result);
			c.registerCB("testID", null);
		}
	});
	c.callID("testID", "ECHO", ["hello"]);

	c.call("BADCMD", null, echoResult);
	c.callID("idThatIsNotRegistered", "ECHO", ["testid"], echoResult);

	testExpectException(c, c.registerCB, [123], "registerCB non-string");
	testExpectException(c, c.callID, [123], "callID non-string");

	c.registerCB("_pubsub", echoResult);
	c.call("SUBSCRIBE", ["channelName", "channelName2", "channelName3", "channelName2"]);
	c.call("PUBLISH", ["channelName", "chan message 1"]);
	c.call("UNSUBSCRIBE", null, function(err, result) {
		if (err) {
			console.log("Error: could not unsubscribe; " + err);
		} else {
			console.log("Unsubscribed");
			c.registerCB("_pubsub", null);
		}
	});
	c.flush();

	c.call("QUIT", null, echoResult);
	c.flush();
}


function connectClient(cb, cfg) {
	var sock = new libnet.Socket();
	sock.setNoDelay(true);
	sock.connect(4567, "localhost", function onConnect() {
		cb(libopac.newClient(sock, cfg));
	});
}

libopac.Queue.prototype.newChunkSize = 4;
//var sock = new libnet.Socket();
//sock.setNoDelay(true);
//sock.connect(4567, "localhost", function onConnect() {
//	console.log("connected");
//	runTest(sock);
//});
connectClient(runTest);

connectClient(function(c) {
	c.registerCB("testClosedErr", function(err, result) {
		if (err && err[0] == libopac.OpaDef.ERR_CLOSED) {
			console.log("Success: received ERR_CLOSED for async id testClosedErr");
		} else {
			console.log("Error: received response for async id testClosedErr");
		}
	});
	var badobj = {
		"toOpaSO": function(s) {
			console.log("toOpaSO() called");
			throw "testing throw from serialization";
		}
	};
	c.call("ECHO", ["hello", badobj], echoResult);

	// TODO: make sure that closed errors are actually being sent to callbacks
});

var cfg = new libopac.ClientConfig();
cfg.uncaughtExceptionHandler = function() {
	// TODO: try to avoid printing error messages here. change console.log temporarily until this test is done?
	throw new Error("test case, ignore this line and the following printed stack trace");
}
connectClient(function(c) {
	c.call("ECHO", ["hello"], function(err, result) {
		throw new Error("test throw from response cb");
	});
	c.call("QUIT", null, echoResult);
	c.flush();
}, cfg);


