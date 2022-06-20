/**
 * @constructor
 * @implements IWriter
 * @param {!net.Socket} s
 */
function SocketAdapter(s) {
	/** @type {!net.Socket} */
	this.s = s;
	/** @type {?EventClient} */
	this.c = null;
	/** @type {boolean} */
	this.closed = false;
}

/**
 * @param {!Uint8Array} b
 * @return {boolean} false indicates caller should stop writing data; otherwise true
 * @override
 */
SocketAdapter.prototype.write = function(b) {
	if (this.closed) {
		return false;
	}
	// the node socket docs state that the return value from write() should indicate whether the buffer
	// is fully copied. however, this seems to be incorrect. therefore, a copy is allocated.
	// TODO: consider a buffer pool to reuse buffers (write() will invoke a callback when done?)
	return this.s.write(BUFFERFROM(b));
};

/**
 * @override
 */
SocketAdapter.prototype.flush = function() {};

/**
 * @override
 */
SocketAdapter.prototype.close = function() {
	this.closed = true;
	this.s.destroy();
	if (this.c) {
		this.c.onClose();
	}
};

/**
 * @param {!net.Socket} s
 * @param {?ClientConfig=} cfg - Client options. See ClientConfig for details.
 * @return {!EventClient}
 */
function newClient(s, cfg) {
	var wrapper = new SocketAdapter(s);
	var c = new EventClient(wrapper, cfg);
	wrapper.c = c;

	/**
	 * @param {*} e
	 */
	var errorEventCB = function(e) {
		clientError(c, e);
	};

	s.on("error", errorEventCB);

	/**
	 * @param {*} b
	 */
	var dataEventCB = function(b) {
		try {
			if (!(b instanceof Buffer)) {
				throw new Error("socket event data is not instanceof Buffer");
			}
			c.onRecv(b);
		} catch (e) {
			clientError(c, e);
		}
	};

	s.on("data", dataEventCB);

	s.on("close", function(hadError) {
		wrapper.close();
	});

	return c;
}

module.exports.BigDec = BigDec;
module.exports.BigDecimal = BigDec;
module.exports.BigInteger = BigInteger;
module.exports.ClientConfig = ClientConfig;
module.exports.EventClient = EventClient;
module.exports.newClient = newClient;
module.exports.OpaDef = OpaDef;
module.exports.opaType = opaType;
module.exports.PartialParser = PartialParser;
module.exports.Queue = Queue;
module.exports.RoundingMode = RoundingMode;
module.exports.Serializer = Serializer;
module.exports.stringify = opaStringify;
module.exports.version = VERSION;

