
function CC(s) {
	return s.charCodeAt(0);
}

var OpaDef = {
	UNDEFINED    : CC("U"),
	NULL         : CC("N"),
	FALSE        : CC("F"),
	TRUE         : CC("T"),
	ZERO         : CC("!"),
	EMPTYBIN     : CC("b"),
	EMPTYSTR     : CC("s"),
	EMPTYLIST    : CC("_"),
	SORTMAX      : CC("Z"),

	POSVARINT    : CC("$"),
	NEGVARINT    : CC("%"),
	POSPOSVARDEC : CC("P"),
	POSNEGVARDEC : CC("Q"),
	NEGPOSVARDEC : CC("R"),
	NEGNEGVARDEC : CC("V"),
	POSBIGINT    : CC("G"),
	NEGBIGINT    : CC("H"),
	POSPOSBIGDEC : CC("I"),
	POSNEGBIGDEC : CC("J"),
	NEGPOSBIGDEC : CC("K"),
	NEGNEGBIGDEC : CC("M"),

	BINLPVI      : CC("B"),
	STRLPVI      : CC("S"),

	ARRAYSTART   : CC("["),
	ARRAYEND     : CC("]"),

	UndefinedObj  : undefined,
	NullObj       : null,
	FalseObj      : false,
	TrueObj       : true,
	ZeroIntObj    : 0,
	EmptyBinObj   : new Uint8Array(0),
	EmptyStrObj   : "",
	EmptyArrayObj : [],
};

