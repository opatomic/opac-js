/**
 * @param {!Uint8Array} b
 * @return {!ArrayBuffer}
 */
function copyByteArray(b) {
	if (ArrayBuffer.prototype.slice) {
		return b.buffer.slice(b.byteOffset, b.byteLength + b.byteOffset);
	}
	var cpy = new ArrayBuffer(b.byteLength);
	new Uint8Array(cpy).set(b);
	return cpy;
}

/**
 * @constructor
 * @implements IWriter
 * @param {!WebSocket} s
 */
function WebSocketWriter(s) {
	/** @type {!WebSocket} */
	this.s = s;
	/** @type {EventClient} */
	this.c = null;
	/** @type {boolean} */
	this.closed = false;
}

WebSocketWriter.prototype.write = function(b) {
	this.s.send(copyByteArray(b));
	return true;
};

WebSocketWriter.prototype.flush = function() { };

WebSocketWriter.prototype.close = function() {
	this.closed = true;
	this.s.close();
	if (this.c) {
		this.c.onClose();
	}
};

/**
 * @param {!WebSocket} s
 * @param {ClientConfig=} cfg - Client options. See ClientConfig for details.
 * @return {!EventClient}
 */
function newClient(s, cfg) {
	var wrapper = new WebSocketWriter(s);
	var c = new EventClient(wrapper, cfg);
	wrapper.c = c;

	s.addEventListener("message", function(event) {
		c.onRecv(new Uint8Array(event.data));
	});

	s.addEventListener("close", function() {
		wrapper.close();
	});

	return c;
}

var E = {};

E["BigDec"] = BigDec;
E["BigInteger"] = BigInteger;
E["cacheString"] = cacheString;
E["ClientConfig"] = ClientConfig;
E["EventClient"] = EventClient;
E["newClient"] = newClient;
E["OpaDef"] = OpaDef;
E["opaType"] = opaType;
E["PartialParser"] = PartialParser;
E["Queue"] = Queue;
E["Serializer"] = Serializer;
E["stringify"] = opaStringify;
E["version"] = VERSION;

window["Opatomic"] = E;

