
function CC(s) {
	return s.charCodeAt(0);
}

var OpaDef = {
	UNDEFINED    : CC("U"),
	NULL         : CC("N"),
	FALSE        : CC("F"),
	TRUE         : CC("T"),
	ZERO         : CC("O"),
	EMPTYBIN     : CC("A"),
	EMPTYSTR     : CC("R"),
	EMPTYARRAY   : CC("M"),
	SORTMAX      : CC("Z"),

	POSVARINT    : CC("D"),
	NEGVARINT    : CC("E"),
	POSPOSVARDEC : CC("G"),
	POSNEGVARDEC : CC("H"),
	NEGPOSVARDEC : CC("I"),
	NEGNEGVARDEC : CC("J"),
	POSBIGINT    : CC("K"),
	NEGBIGINT    : CC("L"),
	POSPOSBIGDEC : CC("V"),
	POSNEGBIGDEC : CC("W"),
	NEGPOSBIGDEC : CC("X"),
	NEGNEGBIGDEC : CC("Y"),

	BINLPVI      : CC("B"),
	STRLPVI      : CC("S"),

	ARRAYSTART   : CC("["),
	ARRAYEND     : CC("]"),
	
	SORTMAX_OBJ  : {
		toString: function(){return "SORTMAX";}
	},

	ERR_CLOSED : -16394
};

