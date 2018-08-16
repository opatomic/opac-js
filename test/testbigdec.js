function check2(a, b) {
	if (a.compareTo(b) != 0) {
		throw "numbers not equal";
	}
}

function check(a, b) {
	var idx = a.indexOf(" ");
	if (idx < 0 || a.charAt(idx + 2) != " ") {
		throw "space not found in test string";
	}
	var bd1 = new BigDec(a.substring(0, idx));
	var bd2 = new BigDec(a.substring(idx + 2));
	var bd3 = new BigDec(b);
	switch (a.charAt(idx + 1)) {
		case "+":
			return check2(bd1.add(bd2), bd3);
		case "-":
			return check2(bd1.subtract(bd2), bd3);
		case "*":
			return check2(bd1.multiply(bd2), bd3);
		case "/":
			return check2(bd1.divide(bd2), bd3);
		default:
			throw "unknown op";
	}
}

check("1 + 1.1", "2.1");


