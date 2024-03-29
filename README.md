Opatomic client for javascript

This project contains source code for the node.js
[opatomic-client](https://www.npmjs.com/package/opatomic-client) package.
The code can also be built to run in a browser. Running in the browser is
undocumented for now (to see source for a working example check out the
[admin tool](https://github.com/opatomic/admin-browser)).

# Node.js package

Install with:

    npm install opatomic-client

## Usage Example

```js
var libnet = require("net");
var libopac = require("opatomic-client");
var BigInteger = require("jsbn").BigInteger;
var BigDec = libopac.BigDec;

function echoResult(err, result) {
	if (err) {
		console.log("ERROR: " + libopac.stringify(err));
	} else {
		console.log("SUCCESS: " + libopac.opaType(result) + " " + libopac.stringify(result));
	}
}

var sock = new libnet.Socket();
sock.setNoDelay(true);
sock.connect(4567, "localhost", function() {
	console.log("connected");
	var c = libopac.newClient(sock);

	c.call("PING");
	c.call("PING", null, echoResult);
	c.call("ECHO", ["Hello"], echoResult);
	c.call("ECHO", [[undefined, null, false, true, -1, 0, 1, "string", []]], echoResult);

	c.call("INCR", ["TESTkey", -4], echoResult);
	c.call("INCR", ["TESTkey", new BigInteger("12345678901234567890")], echoResult);
	c.call("INCR", ["TESTkey.dec", new BigDec("-1.234")], echoResult);

	// callA() can be used for long running ops so they don't block responses
	// note: op may still block other responses (depends on server implementation)
	c.callA("SINTERSTORE", ["destkey", "set1", "set2"], echoResult);

	c.call("ECHO", ["Hello", "ExtraArg!"], echoResult);
	c.call("BADCMD", ["Hello"], echoResult);

	c.registerCB("_pubsub", echoResult);
	c.call("SUBSCRIBE",  ["channelName", "channelName2", "channelName3", "channelName2"]);
	c.call("PSUBSCRIBE", ["c*", "ch*", "n*", "*"]);
	c.call("PUBLISH", ["channelName", "chan message 1"]);
	c.call("PUNSUBSCRIBE");
	c.call("UNSUBSCRIBE", ["channelName", "channelName2", "channelName3", "channelName2"], function(err, result) {
		if (err) {
			console.log("Error: could not unsubscribe; " + err);
		} else {
			console.log("Unsubscribed");
			c.registerCB("_pubsub", null);
		}
	});
	c.call("PUBLISH", ["channelName", "chan message 2"]);

	// TODO: add example with bigdec

	c.call("QUIT");
});

```


## API
 - newClient(socket)
 - client.call(opname[, args[, callback]])
 - client.callA(opname, args, callback)
 - client.registerCB(asyncID, callback)
 - client.callID(asyncID, opname, args)


## Serializer supported types
 - undefined
 - null
 - boolean (false/true)
 - numbers (integers, floats, +Infinity, -Infinity, -0 ; however, NaN is not supported)
 - strings
 - arrays
 - binary buffer (Buffer for node; Uint8Array for browser)
 - BigInteger (node "jsbn" package)
 - BigDec

