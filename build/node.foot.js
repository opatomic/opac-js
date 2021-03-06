
function newClient(s) {
	var wrapper = {};
	var c = new EventClient(wrapper);

	wrapper.write = function(b) {
		// the node socket docs state that the return value from write() should indicate whether the buffer
		// is fully copied. however, this seems to be incorrect. therefore, a copy is allocated.
		// TODO: consider a buffer pool to reuse buffers (write() will invoke a callback when done?)
		// TODO: back-pressure: this function could return true/false indicating whether stream is writable; store/use this somehow
		s.write(BUFFERFROM(b));
	};

	s.on("data", function(b) {
		c.onRecv(b);
	});

	s.on("close", function(hadError) {
		c.onClose();
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

