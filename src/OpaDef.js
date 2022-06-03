/*
 * Copyright 2018-2019 Opatomic
 * Open sourced with ISC license. Refer to LICENSE for details.
 */

/**
 * @const
 * @ignore
 * @type {number}
 */
var MAX_SAFE_INTEGER =  9007199254740991;

/**
 * @const
 * @ignore
 * @type {number}
 */
var MIN_SAFE_INTEGER = 0 - MAX_SAFE_INTEGER;

/**
 * @const
 * @ignore
 * @type {function(*):boolean}
 */
 // note: must cast type of Number.isInteger due to bug (in closure compiler?). They have the
 //  function type declared as function(number):boolean when it should be function(*):boolean.
 // TODO: remove this type cast in future if bug gets fixed?
var isInteger = (/** @type {function(*):boolean} */ (Number.isInteger)) || function(v) {
	return typeof v === "number" && isFinite(v) && Math.floor(v) === v;
};

/**
 * @const
 * @ignore
 * @type {function(number):boolean}
 */
var isSafeInteger = Number.isSafeInteger || function(v) {
	return isInteger(v) && v >= MIN_SAFE_INTEGER && v <= MAX_SAFE_INTEGER;
};

/**
 * @const {number}
 * @ignore
 */
var CH_UNDEFINED    = "U".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_NULL         = "N".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_FALSE        = "F".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_TRUE         = "T".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_ZERO         = "O".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_NEGINF       = "P".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_POSINF       = "Q".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_EMPTYBIN     = "A".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_EMPTYSTR     = "R".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_EMPTYARRAY   = "M".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_SORTMAX      = "Z".charCodeAt(0);

/**
 * @const {number}
 * @ignore
 */
var CH_POSVARINT    = "D".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_NEGVARINT    = "E".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_POSPOSVARDEC = "G".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_POSNEGVARDEC = "H".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_NEGPOSVARDEC = "I".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_NEGNEGVARDEC = "J".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_POSBIGINT    = "K".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_NEGBIGINT    = "L".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_POSPOSBIGDEC = "V".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_POSNEGBIGDEC = "W".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_NEGPOSBIGDEC = "X".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_NEGNEGBIGDEC = "Y".charCodeAt(0);

/**
 * @const {number}
 * @ignore
 */
var CH_BINLPVI      = "B".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_STRLPVI      = "S".charCodeAt(0);

/**
 * @const {number}
 * @ignore
 */
var CH_ARRAYSTART   = "[".charCodeAt(0);
/**
 * @const {number}
 * @ignore
 */
var CH_ARRAYEND     = "]".charCodeAt(0);

/**
 * @constructor
 * @ignore
 */
function OpaSortMax() {
	/**
	 * @return {string}
	 * @override
	 */
	this.toString = function() {
		return "SORTMAX";
	};
}

/**
 * @constructor
 * @hideconstructor
 */
var OpaDef = function() { };

(function() {

/** @const {number} */
OpaDef.UNDEFINED    = CH_UNDEFINED;
/** @const {number} */
OpaDef.NULL         = CH_NULL;
/** @const {number} */
OpaDef.FALSE        = CH_FALSE;
/** @const {number} */
OpaDef.TRUE         = CH_TRUE;
/** @const {number} */
OpaDef.ZERO         = CH_ZERO;
/** @const {number} */
OpaDef.NEGINF       = CH_NEGINF;
/** @const {number} */
OpaDef.POSINF       = CH_POSINF;
/** @const {number} */
OpaDef.EMPTYBIN     = CH_EMPTYBIN;
/** @const {number} */
OpaDef.EMPTYSTR     = CH_EMPTYSTR;
/** @const {number} */
OpaDef.EMPTYARRAY   = CH_EMPTYARRAY;
/** @const {number} */
OpaDef.SORTMAX      = CH_SORTMAX;

/** @const {number} */
OpaDef.POSVARINT    = CH_POSVARINT;
/** @const {number} */
OpaDef.NEGVARINT    = CH_NEGVARINT;
/** @const {number} */
OpaDef.POSPOSVARDEC = CH_POSPOSVARDEC;
/** @const {number} */
OpaDef.POSNEGVARDEC = CH_POSNEGVARDEC;
/** @const {number} */
OpaDef.NEGPOSVARDEC = CH_NEGPOSVARDEC;
/** @const {number} */
OpaDef.NEGNEGVARDEC = CH_NEGNEGVARDEC;
/** @const {number} */
OpaDef.POSBIGINT    = CH_POSBIGINT;
/** @const {number} */
OpaDef.NEGBIGINT    = CH_NEGBIGINT;
/** @const {number} */
OpaDef.POSPOSBIGDEC = CH_POSPOSBIGDEC;
/** @const {number} */
OpaDef.POSNEGBIGDEC = CH_POSNEGBIGDEC;
/** @const {number} */
OpaDef.NEGPOSBIGDEC = CH_NEGPOSBIGDEC;
/** @const {number} */
OpaDef.NEGNEGBIGDEC = CH_NEGNEGBIGDEC;

/** @const {number} */
OpaDef.BINLPVI      = CH_BINLPVI;
/** @const {number} */
OpaDef.STRLPVI      = CH_STRLPVI;

/** @const {number} */
OpaDef.ARRAYSTART   = CH_ARRAYSTART;
/** @const {number} */
OpaDef.ARRAYEND     = CH_ARRAYEND;

/** @const {!OpaSortMax} */
OpaDef.SORTMAX_OBJ = new OpaSortMax();

/** @const {number} */
OpaDef.ERR_CLOSED = -1;

}());


