// dependencies: STRENC PartialParser Serializer Deque Map

/**
 * @callback ResponseCallback
 * @param {Object} result - The result of the operation. Can be null.
 * @param {Object} error  - If response is an error then result is null and error is non-null
 */


/**
 * Create new StreamClient.
 * @param o - Object that has a write() and flush() method.
 */
function StreamClient(o) {
	this.s = new Serializer(o);
	this.id = 0;
	this.mMainCallbacks = new Deque();
	this.mAsyncCallbacks = new Map();
	this.mParser = new PartialParser();
	this.mBuff = this.mParser.newBuff();
	this.mTimeout = null;
}

var P = StreamClient.prototype;

function schedTimeout(c) {
	if (c.mTimeout === null) {
		// TODO: use process.nextTick() in node?
		c.mTimeout = setTimeout(function() {
			c.mTimeout = null;
			c.s.flush();
		}, 0);
	}
}

function writeCommand(c, cmd) {
	// note: command cache was removed. STR2BUF (in Serializer) can be used instead
	c.s.writeString(cmd);
}

function callNoResponse(c, cmd, args) {
	// if no callback is specified then send null as async id indicating server must not send response
	c.s.write1(OpaDef.ARRAYSTART);
	writeCommand(c, cmd);
	c.s.writeObject(args ? args : null);
	c.s.write1(OpaDef.NULL);
	c.s.write1(OpaDef.ARRAYEND);
}

/**
 * Send all buffered requests.
 */
P.flush = function() {
	if (this.mTimeout != null) {
		clearTimeout(this.mTimeout);
		this.mTimeout = null;
	}
	this.s.flush();
}

/**
 * Sends the specified command and args to the server. Invokes the specified callback when a response is received.
 * @param {string} cmd - The command to run
 * @param {Array=} args - The parameters for the command
 * @param {ResponseCallback=} cb - A callback function to invoke when the response is received
 */
P.call = function(cmd, args, cb) {
	if (!cb) {
		return callNoResponse(this, cmd, args);
	}
	this.s.write1(OpaDef.ARRAYSTART);
	writeCommand(this, cmd);
	if (args) {
		this.s.writeObject(args);
	}
	this.s.write1(OpaDef.ARRAYEND);
	schedTimeout(this);
	this.mMainCallbacks.push(cb);
}

function callId(c, cmd, args, cb, isP) {
	++c.id;
	var id = isP ? 0 - c.id : c.id;

	c.s.write1(OpaDef.ARRAYSTART);
	writeCommand(c, cmd);
	c.s.writeObject(args);
	c.s.writeNumber(id);
	c.s.write1(OpaDef.ARRAYEND);
	schedTimeout(c);
	c.mAsyncCallbacks.set(id, cb);
	return id;
}

/**
 * Sends the specified command and args to the server with an async id. Using an async id indicates to the
 * server that the operation response can be sent out of order. Invokes the specified callback when a
 * response is received.
 * @param {string} cmd - The command to run
 * @param {!Array} args - The parameters for the command
 * @param {!ResponseCallback} cb - A callback function to invoke when the response is received
 */
P.callA = function(cmd, args, cb) {
	callId(this, cmd, args, cb, 0);
}

/**
 * Same as callA() except that the callback can be invoked multiple times. Use this for subscriptions.
 * @param {string} cmd - The command to run
 * @param {!Array} args - The parameters for the command
 * @param {!ResponseCallback} cb - A callback function to invoke when the responses are received
 * @return {*} - The value that is used when calling unregister()
 */
P.callAP = function(cmd, args, cb) {
	return callId(this, cmd, args, cb, 1);
}

/**
 * Removes the specified async callback from the client. Use this when unsubscribing from a channel.
 * @param {*} id - The value that was returned from callAP()
 */
P.unregister = function(id) {
	return this.mAsyncCallbacks.delete(id);
}

function onResponse(c, msg) {
	var cb;
	var id = msg.length >= 3 ? msg[2] : null;
	if (id !== null && id !== undefined) {
		cb = c.mAsyncCallbacks.get(id);
		if (id > 0) {
			c.mAsyncCallbacks.delete(id);
		}
	} else {
		cb = c.mMainCallbacks.shift();
	}

	if (cb != null) {
		if (msg.length >= 2) {
			// failure
			cb(msg[0], msg[1]);
		} else {
			// success
			cb(msg[0]);
		}
	}
}

/**
 * Call this method when more data has arrived from server. Buffer will be parsed
 * and callbacks invoked for each complete response received.
 * @param b - Byte buffer containing data to parse. Type is Uint8Array when running in browser.
 *            Type is Buffer when running in node
 */
P.onRecv = function(b) {
	this.mBuff.data = b;
	this.mBuff.idx = 0;
	this.mBuff.len = b.length;
	while (true) {
		var obj = this.mParser.parseNext(this.mBuff);
		if (obj == null) {
			break;
		}
		onResponse(this, obj);
	}
}

/**
 * Call this method when connection is closed. All request callbacks that have not received a response
 * will be notified of failure. Every persistent async callback will also be notified of failure.
 */
P.onClose = function() {
	var tmp = this.mMainCallbacks;
	while (tmp.length > 0) {
		var cb = tmp.shift();
		if (cb) {
			cb(null, OpaDef.ERR_CLOSED);
		}
	}

	tmp = this.mAsyncCallbacks;
	tmp.forEach(function(val, key, map) {
		if (val) {
			val(null, OpaDef.ERR_CLOSED);
		}
	});
	tmp.clear();
}

/**
 * Cache the utf-8 bytes for a string in memory. Improves performance slightly by
 * avoiding an allocation + conversion every time the string is serialized or parsed.
 * Use for strings that are repeated often.
 * @param {string} s - The string to cache
 */
P.cacheString = function(s) {
	var b = STRENC(s);
	if (this.mParser.BUF2STR) {
		this.mParser.BUF2STR.set(b, s);
	}
	if (this.s.STR2BUF) {
		this.s.STR2BUF.set(s, b);
	}
}

