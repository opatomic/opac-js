/*
 * Copyright 2018-2019 Opatomic
 * Open sourced with ISC license. Refer to LICENSE for details.
 */

/**
 * @param {*} o
 * @return {string}
 */
function opaType(o) {
	var t = typeof o;
	if (t == "object") {
		o = /** @type {?Object} */ (o); // eslint-disable-line no-self-assign
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
	throw new Error("unknown object");
}

/**
 * @alias stringify
 * @param {*} obj
 * @param {(number|string)=} space
 * @return {string}
 */
var opaStringify = function(obj, space) {};

(function() {
	/**
	 * @param {number|string|undefined} space
	 * @param {number} depth
	 * @return {string}
	 */
	function getindent(space, depth) {
		var indent = "";
		var i;
		if (typeof space === "number") {
			for (i = 0; i < space * depth; ++i) {
				indent += " ";
			}
		} else if (typeof space === "string") {
			for (i = 0; i < depth; ++i) {
				indent += space;
			}
		}
		return indent;
	}

	/**
	 * @param {!Uint8Array} b
	 * @return {string}
	 */
	function stringifyBlob(b) {
		var res = "'";
		for (var i = 0; i < b.length; ++i) {
			var ch = b[i];
			if (ch >= 0x20 && ch < 0x7F) {
				if (ch == 92 || ch == 39) {
					// escape backslash or single-quote character
					res += "\\";
				}
				res += String.fromCharCode(ch);
			} else if (ch == 9) {
				res += "\\t";
			} else if (ch == 10) {
				res += "\\n";
			} else if (ch == 13) {
				res += "\\r";
			} else {
				res += "\\x";
				if (ch < 16) {
					res += "0";
				}
				res += ch.toString(16);
			}
		}
		res += "'";
		return res;
	}

	/**
	 * @param {*} obj
	 * @param {number|string|undefined} space
	 * @param {number} depth
	 * @return {string}
	 */
	function opaStringifyInternal(obj, space, depth) {
		var t = opaType(obj);
		switch (t) {
			case "undefined":
			case "null":
				return t;
			//case "SORTMAX":
			//	return "SORTMAX";
			//case "boolean":
			//case "number":
			//case "BigInteger":
			//case "BigDec":
			//	return obj.toString();
			case "number":
				// special code because (-0).toString() is "0" rather than "-0"
				obj = /** @type {number} */ (obj); // eslint-disable-line no-self-assign
				return (obj == 0 && 1 / obj == -Infinity) ? "-0" : obj.toString();
			case "Uint8Array":
			case "Buffer":
				return stringifyBlob(/** @type {!Uint8Array} */ (obj));
			case "string":
				return JSON.stringify(/** @type {string} */ (obj));
			case "Array":
				obj = /** @type {!Array} */ (obj); // eslint-disable-line no-self-assign
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
		throw new Error("unhandled case in switch");
	}

	/**
	 * @param {*} obj
	 * @param {(number|string)=} space
	 * @return {string}
	 */
	opaStringify = function(obj, space) {
		return opaStringifyInternal(obj, space, 0);
	};

}());

