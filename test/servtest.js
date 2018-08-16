
var libnet = require("net");
var BigInteger = require("jsbn").BigInteger;

var libopac = require("../build/node/opac.node.js");
var OpaDef = libopac.OpaDef;
var BigDec = libopac.BigDec;
//var PartialParser = libopac.PartialParser;




function echoResult(result, err) {
	if (err) {
		console.log("ERROR: " + libopac.stringify(err));
	} else {
		console.log("SUCCESS: " + libopac.opaType(result) + " " + libopac.stringify(result));
	}
}

function expectErr(result, err) {
	if (result) {
		console.log("ERR: expected err; got result " + libopac.stringify(result));
	}
}

function runTest2(c) {
	c.call("PING");
	c.call("PING");
	c.call("ECHO", [0], echoResult);
	var sub1 = c.callPersistent("SUBSCRIBE", ["ch1"], echoResult);
	c.call("PUBLISH", ["ch1","msg1"], echoResult);
	c.call("PUBLISH", ["ch1","msg2"], echoResult);
	c.call("PUBLISH", ["ch2","msg3"], echoResult);
	var sub2 = c.callPersistent("SUBSCRIBE", ["ch2"], echoResult);
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
	[OpaDef.BINLPVI, 0], // binary with 0 len
	[OpaDef.STRLPVI, 0], // string with 0 len
	[OpaDef.POSVARINT, 0], // 0 encoded as pos varint
	[OpaDef.NEGVARINT, 0], // 0 encoded as neg varint
	[OpaDef.POSVARINT, 0x80 | 0, 0], // pos varint with MSB of 0
	[OpaDef.NEGVARINT, 0x80 | 0, 0], // neg varint with MSB of 0
	[OpaDef.POSVARINT,0x80|1,0x80|1,0x80|1,0x80|1,0x80|1,0x80|1,0x80|1,0x80|1,0x80|1,1], // 10 byte varint
	[OpaDef.POSPOSVARDEC, 0, 0],
	[OpaDef.POSPOSVARDEC, 0, 1],
	[OpaDef.POSPOSVARDEC, 1, 0],
	[OpaDef.POSPOSBIGINT, 0],       // bigint len is 0
	[OpaDef.POSPOSBIGINT, 1, 0],    // mantissa is 0
	[OpaDef.POSPOSBIGINT, 2, 0, 1], // MSB is 0
	[OpaDef.POSPOSBIGDEC, 0, 0],    // exp is 0, bigint len is 0
	[OpaDef.POSPOSBIGDEC, 0, 1, 0], // exp is 0, mantissa is 0
	[OpaDef.POSPOSBIGDEC, 0, 1, 1], // exp is 0
	[OpaDef.POSPOSBIGDEC, 0, 2, 0, 1], // exp is 0
	[OpaDef.POSPOSBIGDEC, 0, 2, 1, 1], // exp is 0
	[OpaDef.POSPOSBIGDEC, 1, 0],       // bigint length is 0
	[OpaDef.POSPOSBIGDEC, 1, 1, 0],    // mantissa is 0
	[OpaDef.POSPOSBIGDEC, 1, 2, 0, 1], // MSB is 0
];

function testBadValue(v) {
	var s = connect(4567, "localhost", function() {
		var c = libopac.newClient(s);
		c.s.write1(OpaDef.ARRAYSTART);
		c.s.writeString("ECHO");
		c.s.write1(OpaDef.ARRAYSTART);
		c.s.write(v);
		c.s.write1(OpaDef.ARRAYEND);
		c.s.write1(OpaDef.ARRAYEND);
		c.mMainCallbacks.push(expectErr);
		c.call("QUIT");
		c.flush();
	}, 1000);
}

function testBadValues() {
	for (var i = 0; i < BADVALS.length; ++i) {
		testBadValue(Uint8Array.of(BADVALS[i]));
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
testBigExp(new BigDec(new BigInteger("1"), -0x7FFFFFFF - 1));
testBigExp(new BigDec(new BigInteger("1"), 0x7FFFFFFF + 1));



var sock = new libnet.Socket();
sock.setNoDelay(true);
sock.connect(4567, "localhost", function() {
	console.log("connected");
	var c = libopac.newClient(sock);
	//runTest(c);
	testSendFIN(c);
});

