/*
 * Copyright 2018-2019 Opatomic
 * Open sourced with ISC license. Refer to LICENSE for details.
 */

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
	this.toString = function(){return "SORTMAX";}
}

/**
 * @class OpaDef
 * @hideconstructor
 */
var OpaDef = {};

(function(){

/**
 * @param {!string} s
 * @return {number}
 */
function CC(s) {
	return s.charCodeAt(0);
}

/** @const {number} */
OpaDef.UNDEFINED    = CC("U");
/** @const {number} */
OpaDef.NULL         = CC("N");
/** @const {number} */
OpaDef.FALSE        = CC("F");
/** @const {number} */
OpaDef.TRUE         = CC("T");
/** @const {number} */
OpaDef.ZERO         = CC("O");
/** @const {number} */
OpaDef.EMPTYBIN     = CC("A");
/** @const {number} */
OpaDef.EMPTYSTR     = CC("R");
/** @const {number} */
OpaDef.EMPTYARRAY   = CC("M");
/** @const {number} */
OpaDef.SORTMAX      = CC("Z");

/** @const {number} */
OpaDef.POSVARINT    = CC("D");
/** @const {number} */
OpaDef.NEGVARINT    = CC("E");
/** @const {number} */
OpaDef.POSPOSVARDEC = CC("G");
/** @const {number} */
OpaDef.POSNEGVARDEC = CC("H");
/** @const {number} */
OpaDef.NEGPOSVARDEC = CC("I");
/** @const {number} */
OpaDef.NEGNEGVARDEC = CC("J");
/** @const {number} */
OpaDef.POSBIGINT    = CC("K");
/** @const {number} */
OpaDef.NEGBIGINT    = CC("L");
/** @const {number} */
OpaDef.POSPOSBIGDEC = CC("V");
/** @const {number} */
OpaDef.POSNEGBIGDEC = CC("W");
/** @const {number} */
OpaDef.NEGPOSBIGDEC = CC("X");
/** @const {number} */
OpaDef.NEGNEGBIGDEC = CC("Y");

/** @const {number} */
OpaDef.BINLPVI      = CC("B");
/** @const {number} */
OpaDef.STRLPVI      = CC("S");

/** @const {number} */
OpaDef.ARRAYSTART   = CC("[");
/** @const {number} */
OpaDef.ARRAYEND     = CC("]");

/** @const {!OpaSortMax} */
OpaDef.SORTMAX_OBJ = new OpaSortMax();

/** @const {number} */
OpaDef.ERR_CLOSED = -16394;

}());


