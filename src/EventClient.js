/*
 * Copyright 2018-2019 Opatomic
 * Open sourced with ISC license. Refer to LICENSE for details.
 */

// dependencies: STRENC PartialParser Serializer Queue Map

/**
 * @ignore
 * @typedef {function(*, *=):undefined}
 */
var ResponseCallback;

/**
 * @callback ResponseCallback
 * @param {*}  error  - Error or null if no error occurred.
 * @param {*=} result - The result of the operation if error didn't occur (error is null).
 */


/**
 * @constructor
 * @template K,V
 * @extends {Map<K,V>}
 * @ignore
 */
var IdMap = function(){}
if (typeof Map == "function") {
	IdMap = Map;
} else {
	/**
	 * @constructor
	 * @template K,V
	 * @extends {Map<K,V>}
	 * @ignore
	 */
	IdMap = function() {
		// note: this Map implementation is designed to work with keys that are strings or integers
		//   it is not a proper polyfill for ES6 Map
		/** @type {Object} */
		this.vals = {};
	}

	/**
	 * @param {*} key
	 */
	IdMap.prototype.get = function(key) {
		return this.vals[key];
	}

	/**
	 * @param {K} key
	 * @param {V} val
	 */
	IdMap.prototype.set = function(key, val) {
		this.vals[key] = val;
	}

	/**
	 * @param {*} key
	 */
	IdMap.prototype.delete = function(key) {
		var exists = key in this.vals;
		delete this.vals[key];
		return exists;
	}

	IdMap.prototype.forEach = function(cb) {
		for (var p in this.vals) {
			cb(this.vals[p], p, this);
		}
	}

	IdMap.prototype.clear = function() {
		this.vals = {};
	}
}


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
	this.mAsyncCallbacks = new IdMap();
	/** @type {!PartialParser} */
	this.mParser = new PartialParser();
	/** @type {PartialParser.Buff} */
	this.mBuff = new PartialParser.Buff();
	/** @type {number|null} */
	this.mTimeout = null;
	/** @type {boolean} */
	this.mFlushScheduled = false;
}

(function(){

/**
 * @param {!EventClient} c
 */
function schedTimeout(c) {
	if (!c.mFlushScheduled) {
		c.mTimeout = NEXTTICK(function() {
			c.mFlushScheduled = false;
			c.mTimeout = null;
			c.s.flush();
		});
		c.mFlushScheduled = true;
	}
}

/**
 * Send all buffered requests.
 */
EventClient.prototype.flush = function() {
	if (this.mTimeout !== null) {
		clearTimeout(this.mTimeout);
		this.mFlushScheduled = false;
		this.mTimeout = null;
	}
	this.s.flush();
}

/**
 * @param {!EventClient} c
 * @param {*} asyncid
 * @param {string} cmd
 * @param {Array=} args
 */
function writeRequest(c, asyncid, cmd, args) {
	c.s.write1(CH_ARRAYSTART);
	c.s.writeObject(asyncid);
	c.s.writeObject(cmd);
	if (args) {
		for (var i = 0; i < args.length; ++i) {
			c.s.writeObject(args[i]);
		}
	}
	c.s.write1(CH_ARRAYEND);
	schedTimeout(c);
}

/**
 * Sends the specified command and args to the server. Invokes the specified callback when a response is received.
 * @param {string} cmd - The command to run
 * @param {Array=} args - The parameters for the command
 * @param {ResponseCallback=} cb - A callback function to invoke when the response is received
 */
EventClient.prototype.call = function(cmd, args, cb) {
	if (cb) {
		this.mMainCallbacks.push(cb);
		writeRequest(this, null, cmd, args);
	} else {
		// no callback function: send false as asyncid so server does not send a response
		writeRequest(this, false, cmd, args);
	}
}

/**
 * @param {!EventClient} c
 * @param {*} id
 * @param {?ResponseCallback} cb
 */
function regCB(c, id, cb) {
	if (cb == null) {
		c.mAsyncCallbacks.delete(id);
	} else {
		c.mAsyncCallbacks.set(id, cb);
	}
}

/**
 * Register a callback to an async id that can be used by callID().
 * @param {string} id - Async ID: must be a string.
 * @param {?ResponseCallback} cb - A callback function to invoke when each response is received.
                                   Use null to remove registered callback.
 */
EventClient.prototype.registerCB = function(id, cb) {
	if (typeof id != "string") {
		throw "id must be a string";
	}
	regCB(this, id, cb);
}

/**
 * Run specified command on the server with a specified async id. Any responses to the command
 * will invoke the callback that was given as a parameter to registerCB().
 * @param {string} id - Async id
 * @param {string} cmd - The command to run
 * @param {!Array} args - The parameters for the command
 */
EventClient.prototype.callID = function(id, cmd, args) {
	if (typeof id != "string") {
		throw "id must be a string";
	}
	writeRequest(this, id, cmd, args);
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
	var c = this;
	var id = ++c.id;
	regCB(c, id, function(err, result) {
		regCB(c, id, null);
		cb(err, result);
	});
	writeRequest(c, id, cmd, args);
}

/**
 * @param {!EventClient} c
 * @param {!Array<*>} msg
 */
function onResponse(c, msg) {
	if (msg.length < 2 || msg.length > 3) {
		throw "response array is wrong length";
	}
	var cb;
	var id = msg[0];
	if (id !== null && id !== undefined) {
		cb = c.mAsyncCallbacks.get(id);
		if (cb != null && isInteger(id) && (/** @type {number} */(id) > 0)) {
			c.mAsyncCallbacks.delete(id);
		}
	} else {
		cb = c.mMainCallbacks.shift();
	}

	if (cb != null) {
		cb(msg.length > 2 ? msg[2] : null, msg[1]);
	} else {
		// TODO: callback for unknown asyncid
		if (console.log) {
			console.log("unknown async id: " + id);
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
			cb(OpaDef.ERR_CLOSED);
		}
	}

	tmp = this.mAsyncCallbacks;
	tmp.forEach(function(val, key, map) {
		if (val) {
			val(OpaDef.ERR_CLOSED);
		}
	});
	tmp.clear();
}

}());

