"use strict";






if (!Buffer.prototype.subarray) {
	Buffer.prototype.subarray = Buffer.prototype.slice;
}

if (typeof Uint8Array != "function" || Buffer.prototype.set === undefined || Buffer.prototype.set != Uint8Array.prototype.set) {
	Buffer.prototype.set = function(array, offset) {
		// note: this isn't a proper polyfill. it is just what is needed by this library
		//if (arguments.length < 1) {
		//	throw new TypeError("set() requires at least 1 parameter");
		//}
		offset = arguments.length > 1 ? offset : 0;
		if (offset + array.length > this.length) {
			throw new RangeError("offset + source length extends past the end of this array");
		}
		for (var i = 0; i < array.length; ++i) {
			this[offset + i] = array[i];
		}
	}
}






var libnet = require("net");
var BigInteger = require("jsbn").BigInteger;

var libopac = require("../build/node/opac.node.js");
var BigDec = libopac.BigDec;
var PartialParser = libopac.PartialParser;


//Big.prototype.toOpaSO = function(s) {
//	s.writeObject(new BigDec(this.toString()));
//}

var MAX_SAFE_INTEGER =  9007199254740991;
var MIN_SAFE_INTEGER = 0 - MAX_SAFE_INTEGER;

var BufferFrom = typeof Buffer.alloc == 'function' ? Buffer.from : function(a, b, c) {
	return new Buffer(a, b, c);
}

function assert(v, m) {
	if (!v) {
		throw m;
	}
}

function BuffSet(buff, array, offset) {
	offset = arguments.length > 2 ? offset : 0;
	if (offset + array.length > buff.length) {
		throw new RangeError("offset + source length extends past the end");
	}
	for (var i = 0; i < array.length; ++i) {
		buff[offset + i] = array[i];
	}
}

function echoResult(err, result) {
	if (err) {
		console.log("ERROR: " + libopac.stringify(err));
	} else {
		console.log("SUCCESS: " + libopac.opaType(result) + " " + libopac.stringify(result));
	}
}

function bench(c, its, cmd, args) {
	var t = new Date().getTime();
	for (var i = 0; i < its - 1; ++i) {
		c.callA(cmd, args, null);
	}
	c.call(cmd, args, function(result, err) {
		if (err) {
			console.log("error!");
		}
		console.log("bench time: " + ((new Date().getTime()) - t));
		console.log("cbs: " + c.mMainCallbacks.length + "; " + Object.keys(c.mAsyncCallbacks).length);
	});
	c.flush();
}

function benchEncStr(str, its, w) {
	for (var i = 0; i < its; ++i) {
		w.write(BufferFrom(str, "utf-8"));
	}
}

function benchParser(obj, its) {
	var buff = new Uint8Array(1024);
	var buffLen = 0;
	var writer = {};
	writer.write = function(b) {
		buff.set(b, buffLen);
		buffLen += b.length;
		return true;
	}
	writer.on = function() {
	}
	var c = libopac.newClient(writer);
	c.s.writeObject(obj);
	c.flush();
	console.log("buff len: " + buffLen);
	console.log(buff.subarray(0, buffLen));

	var pp = new PartialParser();
	var pb = new PartialParser.Buff();
	pb.data = buff;
	var t = new Date().getTime();
	for (var i = 0; i < its; ++i) {
		pb.idx = 0;
		pb.len = buffLen;
		var obj = pp.parseNext(pb);
		if (obj == null) {
			throw "obj not parsed";
		}
	}
	console.log("time: " + ((new Date().getTime()) - t));
}

function benchEnc() {
	var t = new Date().getTime();
	var writer = {};
	writer.write = function(b) {
		return true;
	}
	writer.on = function() {
	}
	var c = libopac.newClient(writer);

	var its = 1000000;

	//bench(c, its, "ECHO", [new BigDec("2147483647")]);
	//bench(c, its, "ECHO", [new BigDec("0")]);
	//bench(c, its, "ECHO", [new BigDec("12345")]);
	//bench(c, its, "ECHO", [2147483647]);
	//bench(c, its, "ECHO", [2147483649]);
	//bench(c, its, "ECHO", [MAX_SAFE_INTEGER]);
	//bench(c, its, "ECHO", [MIN_SAFE_INTEGER]);
	//bench(c, its, "ECHO", [new BigDec("2147483649")]);
	//bench(c, its, "ECHO", [new BigDec("9223372036854775807")]);
	//bench(c, 100000, "ECHO", [new BigDec("89237487234723984789237489237849723984728347982378947")]);
	//bench(c, 100000, "ECHO", [new BigDec("-89237487234723984789237489237849723984728347982378947")]);
	//bench(c, 100000, "ECHO", [new BigInteger("89237487234723984789237489237849723984728347982378947")]);
	//bench(c, 100000, "ECHO", [new BigInteger("-89237487234723984789237489237849723984728347982378947")]);

	//bench(c, its, "ECHO", [undefined]);
	//bench(c, its, "ECHO", [null]);
	//bench(c, its, "ECHO", [false]);
	//bench(c, its, "ECHO", [true]);
	//bench(c, its, "ECHO", [0]);
	//bench(c, its, "ECHO", [""]);
	//bench(c, its, "ECHO", [new Uint8Array(0)]);
	//bench(c, its, "ECHO", [[]]);
	//bench(c, its, "ECHO", ["h"]);
	//bench(c, its, "ECHO", ["hello"]);
	//bench(c, its, "ECHO", [MAX_SAFE_INTEGER]);
	//bench(c, its, "ECHO", [new BigDec(MAX_SAFE_INTEGER.toString())]);
	//bench(c, its, "ECHO", [new BigDec(MAX_SAFE_INTEGER.toString() + "e-11")]);
	//bench(c, its, "ECHO", [MAX_SAFE_INTEGER - 1]);
	//bench(c, its, "ECHO", [MAX_SAFE_INTEGER + 1]);
	//bench(c, its, "ECHO", [new BigDec((MAX_SAFE_INTEGER + 1).toString())]);
	//bench(c, its, "ECHO", [new BigInteger(MAX_SAFE_INTEGER.toString())]);
	//bench(c, its, "ECHO", [new BigDec("9223372036854775807")]);
	//bench(c, its, "ECHO", [new BigInteger("922337203685477580700")]);
	//bench(c, its, "ECHO", [new BigDec("89237487234723984789237489237849723984728347982378947.1")]);

	//bench(c, its, "ECHO", [new BigInteger((MIN_SAFE_INTEGER).toString())]);
	//bench(c, its, "ECHO", [new BigInteger((MAX_SAFE_INTEGER).toString())]);
	//bench(c, its, "ECHO", [new BigDec((MIN_SAFE_INTEGER).toString())]);
	//bench(c, its, "ECHO", [new BigDec((MAX_SAFE_INTEGER).toString())]);
	//bench(c, its, "ECHO", [new BigInteger("-922337203685477580700904823049832")]);
	//bench(c, its, "ECHO", [new BigDec("-922337203685477580700904823049832.1")]);

	//bench(c, its, "ECHO", [new BigInteger("-9223372036854775807")]);
	//bench(c, its, "ECHO", [Math.pow(2,30)]);
	bench(c, its, "ECHO", [new BigInteger(Math.pow(2,30).toString())]);

	c.flush();

	//benchEncStr("PING", 100000, writer);

	console.log("enc time: " + ((new Date().getTime()) - t));
	console.log(c.id);
}

function runTest(s) {
	var c = libopac.newClient(s);
	var binobj = BufferFrom("hello", "utf-8");

	console.log("s.writableHighWaterMark: " + s.writableHighWaterMark);
	console.log("s.writableLength: " + s.writableLength);

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
	//c.call("ECHO", [Big("1.23e-3")], echoResult);
	c.call("ECHO", [[undefined,null,false,true,-1,0,87687,new BigDec("-1.234e-450"),1.23,"str",[],[8762487264], binobj]], echoResult);
	c.call("ECHO", [[new BigDec("123e456"),new BigDec("123e-456"),new BigDec("-123e456"),new BigDec("-123e-456")]], echoResult);
	c.callA("ECHO", ["testing async callback id"], echoResult);
	c.call("ECHO", [-1.23], echoResult);
	c.flush();

	//var bda = new BigDec("100e2");
	//var bdb = new BigDec("30");
	//var qr = bdb.divideAndRemainder(bda);
	//console.log(qr[0].toString());
	//console.log(qr[1].toString());

	console.log("TODO: write tests for all object types");
	console.log("s.writableHighWaterMark: " + s.writableHighWaterMark);
	console.log("s.writableLength: " + s.writableLength);

	var its = 700000;
	//bench(c, its, "ECHO", [0]);
	//bench(c, its, "ECHO", [1234]);
	//bench(c, its, "ECHO", [Math.pow(2,49) - 1]);
	//bench(c, its, "ECHO", [Math.pow(2,49)]);
	//bench(c, its, "ECHO", [new BigInteger((MAX_SAFE_INTEGER).toString())]);
	//bench(c, its, "ECHO", [1]);
	//bench(c, its, "ECHO", [new BigInteger("1")]);
	//bench(c, its, "ECHO", [2147483647]);
	//bench(c, its, "ECHO", [new BigInteger("2147483647")]);
	//bench(c, its, "ECHO", [new BigDec("123.456")]);
	//bench(c, its, "ECHO", [new BigInteger(Math.pow(2, 31).toString())]);
	bench(c, its, "ECHO", ["hello"]);
	//bench(c, its, "ECHO", [binobj]);
	//bench(c, its, "PING");

	//bench(c, its, "ECHO", [new BigInteger((MIN_SAFE_INTEGER).toString())]);

	c.flush();

	console.log("s.writableHighWaterMark: " + s.writableHighWaterMark);
	console.log("s.writableLength: " + s.writableLength);

	//setTimeout(function() {
	//	s.pause();
	//}, 1);
	//setTimeout(function() {
	//	s.resume();
	//}, 10);

	setTimeout(function() {
		console.log("s.bufferSize: " + s.bufferSize);
		console.log("c.s.i: " + c.s.i);
		console.log("c.mMainCallbacks.length: " + c.mMainCallbacks.length);
		console.log("s.bytesRead: " + s.bytesRead);
		console.log("sending ping; then quit");
		c.call("PING", null, function() {
			console.log("sending QUIT");
			c.call("QUIT", null, function(result, err) {
				//s.close();
				console.log("quit response received");
			});
		});
	}, 6000);

	//c.call("QUIT", null, function(result, err) {
	//	//s.close();
	//});

	c.flush();
}


//benchEnc();

/*
benchParser([0], 1000000);
benchParser([2147483647], 1000000);
benchParser([new BigInteger("2147483647")], 1000000);
benchParser([Math.pow(2,49) - 1], 1000000);
benchParser([Math.pow(2,49)], 1000000);
benchParser([new BigDec("123.456")], 1000000);
benchParser([new BigInteger("21474836472147483647999")], 1000000);
benchParser([new BigDec("21474836472147483647999.1")], 1000000);
*/

//benchParser([new BigInteger("9223372036854775808")], 10);

//benchParser(["hello"], 1000000);
//benchParser([new BigInteger("21474836472147483647999")], 1000000);
//benchParser([new BigInteger("21474836472147483647999")], 1000000);
//benchParser([new BigInteger("-21474836472147483647999")], 1000000);
//benchParser([new BigInteger("-21474836472147483647999")], 1000000);

/*
benchParser([new BigInteger("-9223372036854775808")], 1000000);
benchParser([new BigInteger("-9223372036854775808")], 1000000);
benchParser([new BigInteger("-9223372036854775808")], 1000000);
benchParser([new BigInteger("9223372036854775808")], 1000000);
benchParser([new BigInteger("9223372036854775808")], 1000000);
benchParser([new BigInteger("9223372036854775808")], 1000000);
*/

console.log(libopac.stringify([undefined, null, false, true, -4, -2.23, 0, 1, 1.23, "string", new Buffer([0,1,2,3]), ["subarray"]]));

assert((new BigDec("123e4")).toString() == "123e4");
assert((new BigDec("123e-4")).toString() == "123e-4");
assert((new BigDec("123E4")).toString() == "123e4");
assert((new BigDec("123E4")).toString() == "123e4");
assert((new BigDec("12.3")).toString() == "123e-1");
assert((new BigDec("-12.3")).toString() == "-123e-1");


var sock = new libnet.Socket();
sock.setNoDelay(true);
sock.connect(4567, "localhost", function onConnect() {
	console.log("connected");
	runTest(sock);
});


//console.log("hello from test.js");

