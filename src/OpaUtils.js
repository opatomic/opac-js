
function opaType(o) {
	// TODO: handle sortmin, sortmax
	var t = typeof o;
	if (t == "object") {
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
	throw "unknown object " + o.toString();
}

function indent(space, depth) {
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

function opaStringify(obj, space, depth) {
	switch (opaType(obj)) {
		case "undefined":
			return "undefined";
		case "null":
			return "null";
		case "SORTMAX":
			return "SORTMAX";
		case "boolean":
		case "number":
		//case "BigInteger":
		//case "BigDec":
			return obj.toString();
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
        	return '"~base64' + BTOA(String.fromCharCode.apply(null, obj)) + '"';
		case "string":
			return JSON.stringify(obj.charAt(0) == "~" ? "~" + obj : obj);
		case "Array":
			if (obj.length == 0) {
				return "[]";
			}
			depth = depth ? depth : 0;
			var strs = [];
			for (var i = 0; i < obj.length; ++i) {
				strs[i] = opaStringify(obj[i], space, depth + 1);
			}
			if (!space) {
				return "[" + strs.join(",") + "]";
			}
			var indent1 = indent(space, depth);
			var indent2 = indent(space, depth + 1);
			return "[\n" + indent2 + strs.join(",\n" + indent2) + "\n" + indent1 + "]";
	}
	if (typeof obj.toString === "function") {
		return obj.toString();
	}
	throw "unhandled case in switch";
}

