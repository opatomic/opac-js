// dependencies: STRENC PartialParser Serializer Queue Map

/**
 * @ignore
 * @typedef {function(*, *=):undefined}
 */
var ResponseCallback;

/**
 * @callback ResponseCallback
 * @param {*} result - The result of the operation. Can be null.
 * @param {*=} error - If response is an error then result is null and error is non-null
 */


/**
 * Create new EventClient
 * @constructor
 * @param {!IWriter} o - Object that has a write() and flush() method.
 */
function EventClient(o) {
	/** @type {!Serializer} */
	this.s = new Serializer(o);
	/** @type {number} */
	this.id = 0;
	/** @type {Queue<ResponseCallback>} */
	this.mMainCallbacks = new Queue();
	/** @type {!Map<*,!ResponseCallback>} */
	this.mAsyncCallbacks = new Map();
	/** @type {!PartialParser} */
	this.mParser = new PartialParser();
	/** @type {PartialParser.Buff} */
	this.mBuff = new PartialParser.Buff();
	/** @type {number|null} */
	this.mTimeout = null;
}

(function(){

/**
 * @param {EventClient} c
 */
function schedTimeout(c) {
	if (c.mTimeout === null) {
		// TODO: use process.nextTick() in node?
		c.mTimeout = setTimeout(function() {
			c.mTimeout = null;
			c.s.flush();
		}, 0);
	}
}

/**
 * @param {EventClient} c
 * @param {string} cmd
 */
function writeCommand(c, cmd) {
	// note: command cache was removed. STR2BUF (in Serializer) can be used instead
	c.s.writeString(cmd);
}

/**
 * @param {EventClient} c
 * @param {string} cmd
 * @param {Array=} args
 */
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
EventClient.prototype.flush = function() {
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
EventClient.prototype.call = function(cmd, args, cb) {
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

/**
 * @param {!EventClient} c
 * @param {string} cmd
 * @param {Array} args
 * @param {!ResponseCallback} cb
 * @param {number} isP
 * @return {number}
 */
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
EventClient.prototype.callA = function(cmd, args, cb) {
	callId(this, cmd, args, cb, 0);
}

/**
 * Same as callA() except that the callback can be invoked multiple times. Use this for subscriptions.
 * @param {string} cmd - The command to run
 * @param {!Array} args - The parameters for the command
 * @param {!ResponseCallback} cb - A callback function to invoke when the responses are received
 * @return {*} - The value that is used when calling unregister()
 */
EventClient.prototype.callAP = function(cmd, args, cb) {
	return callId(this, cmd, args, cb, 1);
}

/**
 * Removes the specified async callback from the client. Use this when unsubscribing from a channel.
 * @param {*} id - The value that was returned from callAP()
 */
EventClient.prototype.unregister = function(id) {
	return this.mAsyncCallbacks.delete(id);
}

/**
 * @param {!EventClient} c
 * @param {!Array<*>} msg
 */
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
 * @param {!Uint8Array} b - Byte buffer containing data to parse
 */
EventClient.prototype.onRecv = function(b) {
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
EventClient.prototype.onClose = function() {
	var tmp = this.mMainCallbacks;
	while (tmp.size() > 0) {
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

}());

