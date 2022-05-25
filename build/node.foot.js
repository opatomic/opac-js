/**
 * @constructor
 * @implements IWriter
 * @param {!net.Socket} s
 */
function SocketAdapter(s) {
	/** @type {!net.Socket} */
	this.s = s;
	/** @type {EventClient} */
	this.c = null;
	/** @type {boolean} */
	this.closed = false;
}

SocketAdapter.prototype.write = function(b) {
	if (this.closed) {
		return false;
	}
	// the node socket docs state that the return value from write() should indicate whether the buffer
	// is fully copied. however, this seems to be incorrect. therefore, a copy is allocated.
	// TODO: consider a buffer pool to reuse buffers (write() will invoke a callback when done?)
	return this.s.write(BUFFERFROM(b));
}

SocketAdapter.prototype.flush = function() {}

SocketAdapter.prototype.close = function() {
	this.closed = true;
	this.s.destroy();
	if (this.c) {
		this.c.onClose();
	}
}

/**
 * @param {!net.Socket} s
 * @param {ClientConfig=} cfg - Client options. See ClientConfig for details.
 * @return {!EventClient}
 */
function newClient(s, cfg) {
	var wrapper = new SocketAdapter(s);
	var c = new EventClient(wrapper, cfg);
	wrapper.c = c;

	s.on("data", function(b) {
		c.onRecv(b);
	});

	s.on("close", function(hadError) {
		wrapper.close();
	});

	return c;
}

module.exports.version = VERSION;
module.exports.stringify = opaStringify;
module.exports.opaType = opaType;
module.exports.OpaDef = OpaDef;
module.exports.BigDec = BigDec;
module.exports.newClient = newClient;
module.exports.cacheString = cacheString;
module.exports.PartialParser = PartialParser;
module.exports.Serializer = Serializer;
module.exports.Queue = Queue;
module.exports.ClientConfig = ClientConfig;

