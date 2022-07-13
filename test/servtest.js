
var libnet = require("net");
var BigInteger = require("jsbn").BigInteger;

//var libopac = require("../build/node/opac.node.js");
var libopac = require("opatomic-client");
var OpaDef = libopac.OpaDef;
var BigDec = libopac.BigDec;
//var PartialParser = libopac.PartialParser;


var NEWBUF = (typeof Buffer.allocUnsafe == 'function') ? Buffer.allocUnsafe : function(len) {return new Buffer(len);};

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



function echoResult(err, result) {
	if (err) {
		console.log("ERROR: " + libopac.stringify(err));
	} else {
		console.log("SUCCESS: " + libopac.opaType(result) + " " + libopac.stringify(result));
	}
}

function expectErr(err, result) {
	if (result) {
		console.log("ERR: expected err; got result " + libopac.stringify(result));
	}
}

function expectResult(err, result) {
	if (err) {
		console.log("ERR: expected result; got err " + libopac.stringify(err));
	}
}

function runTest2(c) {
	c.call("PING");
	c.call("PING");
	c.call("ECHO", [0], echoResult);
	c.registerCB("_pubsub", echoResult);
	c.call("SUBSCRIBE", ["ch1"]);
	c.call("PUBLISH", ["ch1","msg1"], echoResult);
	c.call("PUBLISH", ["ch1","msg2"], echoResult);
	c.call("PUBLISH", ["ch2","msg3"], echoResult);
	c.call("SUBSCRIBE", ["ch2"]);
	c.call("PUBLISH", ["ch2","msg4"], echoResult);
	//c.call("QUIT");
}

function testSendFIN(c) {
	c.call("PING");
	c.call("ECHO", ["wait until response, send FIN"], echoResult);
	c.flush();
	sock.end();
}

function runTest(c) {
	runTest2(c);
	var buf = new Uint8Array(1);
	buf[0] = 0;
	c.s.write(buf);
	c.call("ECHO", ["THIS SHOULD NOT APPEAR"], echoResult);
	c.call("QUIT", null, echoResult);
}

function connect(port, host, onconnect, closetimeout) {
	var s = new libnet.Socket();
	s.setNoDelay(true);
	s.connect(port, host, onconnect);

	if (closetimeout) {
		var timer = setTimeout(function() {
			console.log("force closing socket after " + closetimeout + " ms");
			s.close();
		}, closetimeout);
		s.on("close", function() {
			clearTimeout(timer);
		});
	}

	return s;
}

/*
TODO:
 bigdec with exponent greater than signed 32-bit int
 bigint with mantissa that has too many bytes
 test math operation on two numbers with exponent that differs by huge amount, server must detect this and fail rather than consume a ton of memory (implement max memory for bigdec?)
 ARRAYSTART + ARRAYEND (empty array) -> should this be invalid encoding?
 max str len, max bin len?
 max bigint bytes len?
 math op that overflows bigdec exponent
*/
const BADVALS = [
	[OpaDef.POSVARINT, 0x80 | 0, 0], // pos varint with MSB of 0
	[OpaDef.NEGVARINT, 0x80 | 0, 0], // neg varint with MSB of 0
	[OpaDef.POSVARINT,0x80|1,0x80|1,0x80|1,0x80|1,0x80|1,0x80|1,0x80|1,0x80|1,0x80|1,1], // 10 byte varint
	[OpaDef.POSPOSBIGINT, 0],       // bigint len is 0
	[OpaDef.POSPOSBIGINT, 2, 0, 1], // MSB is 0
	[OpaDef.POSPOSBIGDEC, 0, 0],    // exp is 0, bigint len is 0
	[OpaDef.POSPOSBIGDEC, 0, 2, 0, 1], // exp is 0, MSB is 0
	[OpaDef.POSPOSBIGDEC, 1, 0],       // bigint length is 0
	[OpaDef.POSPOSBIGDEC, 1, 2, 0, 1], // MSB is 0

	// invalid utf8:
	[OpaDef.STRLPVI, 1, 0xff],
	[OpaDef.STRLPVI, 2, 0xc2, 0x41],
	[OpaDef.STRLPVI, 1, 0x80],
	[OpaDef.STRLPVI, 1, 0xc2],
	[OpaDef.STRLPVI, 1, 0xe0],
	[OpaDef.STRLPVI, 2, 0xe0,0xff],
	[OpaDef.STRLPVI, 3, 0xe0,0x80,0xff],
	[OpaDef.STRLPVI, 1, 0xe1],
	[OpaDef.STRLPVI, 2, 0xe1,0xff],
	[OpaDef.STRLPVI, 1, 0xed],
	[OpaDef.STRLPVI, 2, 0xed,0xa0],
	[OpaDef.STRLPVI, 3, 0xed,0x80,0xff],
	[OpaDef.STRLPVI, 1, 0xf0],
	[OpaDef.STRLPVI, 2, 0xf0,0x80],
	[OpaDef.STRLPVI, 2, 0xf0,0xff],
	[OpaDef.STRLPVI, 3, 0xf0,0x90,0xff],
	[OpaDef.STRLPVI, 1, 0xf1],
	[OpaDef.STRLPVI, 2, 0xf1,0xff],
	[OpaDef.STRLPVI, 3, 0xf1,0x81,0xff],
	[OpaDef.STRLPVI, 1, 0xf4],
	[OpaDef.STRLPVI, 2, 0xf4,0x90],
	[OpaDef.STRLPVI, 3, 0xf4,0x80,0xff],
];

const GOODVALS = [
	[OpaDef.BINLPVI, 0], // binary with 0 len
	[OpaDef.STRLPVI, 0], // string with 0 len

	[OpaDef.POSVARINT, 0], // 0 encoded as pos varint
	[OpaDef.NEGVARINT, 0], // 0 encoded as neg varint

	[OpaDef.POSPOSVARDEC, 0, 0],
	[OpaDef.POSPOSVARDEC, 0, 1],
	[OpaDef.POSPOSVARDEC, 1, 0],

	[OpaDef.POSBIGINT, 1, 0],    // mantissa is 0

	[OpaDef.POSPOSBIGDEC, 0, 1, 0], // exp is 0, mantissa is 0
	[OpaDef.POSPOSBIGDEC, 0, 1, 1], // exp is 0
	[OpaDef.POSPOSBIGDEC, 0, 2, 1, 1], // exp is 0
	[OpaDef.POSPOSBIGDEC, 1, 1, 0],    // mantissa is 0
];

function testBadValue(v, cbFunc) {
	var s = connect(4567, "localhost", function() {
		var c = libopac.newClient(s);
		c.s.write1(OpaDef.ARRAYSTART);
		c.s.write1(OpaDef.NULL);
		c.s.writeString("ECHO");
		c.s.write1(OpaDef.ARRAYSTART);
		c.s.write(v);
		c.s.write1(OpaDef.ARRAYEND);
		c.s.write1(OpaDef.ARRAYEND);
		c.mMainCallbacks.push(cbFunc);
		c.call("QUIT");
		c.flush();
	}, 1000);
}

Uint8Array.of = function(v) {
	var a = new Uint8Array(v.length);
	for (var i = 0; i < v.length; ++i) {
		a[i] = v[i];
	}
	return a;
}

function testBadValues() {
	for (var i = 0; i < BADVALS.length; ++i) {
		testBadValue(Uint8Array.of(BADVALS[i]), expectErr);
	}
}

function testGoodValues() {
	for (var i = 0; i < GOODVALS.length; ++i) {
		testBadValue(Uint8Array.of(GOODVALS[i]), expectResult);
	}
}

function testBigExp(v) {
	var s = connect(4567, "localhost", function() {
		var c = libopac.newClient(s);
		c.call("ECHO", [v], expectErr);

		c.call("QUIT");
		c.flush();
	}, 1000);
}



testBadValues();
testGoodValues();
testBigExp(new BigDec(new BigInteger("1"), -0x7FFFFFFF - 1));
testBigExp(new BigDec(new BigInteger("1"), 0x7FFFFFFF + 1));
testBigExp(new BigDec(new BigInteger("123456789012345678901234567890"), -0x7FFFFFFF - 1));
testBigExp(new BigDec(new BigInteger("-123456789012345678901234567890"), 0x7FFFFFFF + 1));

//var v = String.fromCharCode.apply(null, new Uint8Array(4));
//console.log(new Buffer(v).toString("base64"));
libopac.stringify([undefined, null, false, true, -4, -2.23, 0, 1, 1.23, "string", NEWBUF(4), ["subarray"]]);

console.log("connecting...");


var sock = new libnet.Socket();
sock.setNoDelay(true);
sock.connect(4567, "localhost", function() {
	console.log("connected");
	var c = libopac.newClient(sock);
	//runTest(c);
	testSendFIN(c);
});

