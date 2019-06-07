/*
 * Copyright 2018-2019 Opatomic
 * Open sourced with ISC license. Refer to LICENSE for details.
 */

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


