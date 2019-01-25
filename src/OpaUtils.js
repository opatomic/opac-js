
/**
 * @param {*} o
 * @return {!string}
 */
function opaType(o) {
	var t = typeof o;
	if (t == "object") {
		o = /** @type {Object} */ (o);
		if (o === null) {
			return "null";
		} else if (Array.isArray(o)) {
			return "Array";
		} else if (o === OpaDef.SORTMAX_OBJ) {
			return "SORTMAX";
		} else if (o instanceof BigInteger) {
			return "BigInteger";
		} else if (o instanceof BigDec) {
			return "BigDec";
		} else if (o.constructor.name == "Uint8Array") {
			return "Uint8Array";
		} else if (o.constructor.name == "Buffer") {
			return "Buffer";
		} else {
			return "object";
		}
		//throw "unknown object " + o.constructor.name + " " + o.toString();
	} else if (t == "string" || t == "number" || t == "boolean" || t == "undefined" || t == "bigint") {
		return t;
	}
	throw "unknown object";
}

/**
 * @alias stringify
 * @param {*} obj
 * @param {(number|string)=} space
 * @return {!string}
 */
function opaStringify(obj, space) {

	/**
	 * @param {number|string|undefined} space
	 * @param {number} depth
	 * @return {!string}
	 */
	function getindent(space, depth) {
		var indent = "";
		if (typeof space === "number") {
			for (var i = 0; i < space * depth ; ++i) {
				indent += " ";
			}
		} else if (typeof space === "string") {
			for (var i = 0; i <= depth; ++i) {
				indent += space;
			}
		}
		return indent;
	}

	/**
	 * @param {*} obj
	 * @param {number|string|undefined} space
	 * @param {number} depth
	 * @return {!string}
	 */
	function opaStringifyInternal(obj, space, depth) {
		switch (opaType(obj)) {
			case "undefined":
				return "undefined";
			case "null":
				return "null";
			//case "SORTMAX":
			//	return "SORTMAX";
			//case "boolean":
			//case "number":
			//case "BigInteger":
			//case "BigDec":
			//	return obj.toString();
			case "Uint8Array":
			case "Buffer":
				//var dv = new DataView(obj.buffer, obj.byteOffset, obj.byteLength);
		    	//for (var i = 0; i < obj.byteLength; ++i) {
				//	if (dv.getUint8(i) < 32 || dv.getUint8(i) > 126) {
				//	    //return '"~base64' + BTOA((new TextDecoder("utf-8")).decode(obj)) + '"';
				//	    return '"~base64' + BTOA(String.fromCharCode.apply(null, obj)) + '"';
				//	}
		    	//}
		    	//return JSON.stringify('~bin' + (new TextDecoder("utf-8")).decode(obj));
		    	return '"~base64' + BTOA(String.fromCharCode.apply(null, /** @type {Uint8Array} */ (obj))) + '"';
			case "string":
				obj = /** @type {!string} */ (obj);
				return JSON.stringify(obj.charAt(0) == "~" ? "~" + obj : obj);
			case "Array":
				obj = /** @type {!Array} */ (obj);
				if (obj.length == 0) {
					return "[]";
				}
				depth = depth ? depth : 0;
				var strs = [];
				for (var i = 0; i < obj.length; ++i) {
					strs[i] = opaStringifyInternal(obj[i], space, depth + 1);
				}
				if (!space) {
					return "[" + strs.join(",") + "]";
				}
				var indent1 = getindent(space, depth);
				var indent2 = getindent(space, depth + 1);
				return "[\n" + indent2 + strs.join(",\n" + indent2) + "\n" + indent1 + "]";
		}
		if (typeof obj.toString === "function") {
			return obj.toString();
		}
		throw "unhandled case in switch";
	}
	
	return opaStringifyInternal(obj, space, 0);
}

/**
 * Cache the utf-8 bytes for a string in memory. Improves performance slightly by
 * avoiding an allocation + conversion every time the string is serialized or parsed.
 * Use for strings that are repeated often.
 * @param {string} s - The string to cache
 */
function cacheString(s) {
	var b = STRENC(s);
	if (PartialParser.BUF2STR) {
		PartialParser.BUF2STR.set(b, s);
	}
	if (Serializer.STR2BUF) {
		Serializer.STR2BUF.set(s, b);
	}
}

