import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
//import opatomic.test.BigDecimal;
//import opatomic.test.BigInteger;
//import opatomic.test.RoundingMode;

public class BigDecCLW {
	private static final byte[] HEXCHARS = "0123456789ABCDEF".getBytes();

	private static String bytesToHex(byte[] b) {
		byte[] charsAsHex = new byte[b.length * 2];
		for (int i = 0, j = 0; i < b.length; ++i) {
			charsAsHex[j++] = HEXCHARS[(b[i] >> 4) & 0x0F];
			charsAsHex[j++] = HEXCHARS[b[i]& 0x0F];
		}
		return new String(charsAsHex);
	}

	private static String objToString(Object obj) {
		if (obj instanceof String) {
			return "s," + obj.toString();
		} else if (obj instanceof Integer || obj instanceof Byte || obj instanceof Short) {
			return "n," + obj.toString();
		} else if (obj instanceof Boolean) {
			return obj.toString();
		} else if (obj instanceof BigInteger) {
			return "BigInt," + obj.toString();
		} else if (obj instanceof BigDecimal) {
			BigDecimal v = (BigDecimal) obj;
			return "BigDec," + v.unscaledValue().toString() + "," + Integer.toString(v.scale());
		} else if (obj instanceof Object[]) {
			Object[] v = (Object[]) obj;
			String res = "[";
			for (int i = 0; i < v.length; ++i) {
				if (i != 0) {
					res += ",";
				}
				res += objToString(v[i]);
			}
			return res + "]";
		} else if (obj instanceof byte[]) {
			//return "byte[]," + bytesToHex((byte[]) obj);
			byte[] bytes = (byte[]) obj;
			StringBuilder sb = new StringBuilder();
			sb.append("[");
			for (int i = 0; i < bytes.length; ++i) {
				if (i != 0) {
					sb.append(",");
				}
				sb.append(objToString(bytes[i]));
			}
			sb.append("]");
			return sb.toString();
		} else if (obj instanceof ArithmeticException) {
			return "E";
		} else {
			throw new RuntimeException("unexpected result");
		}
	}

	private static void logResult(Object res) {
		System.out.println(objToString(res));
	}


	private static void runTestsSolo(BigInteger bi) {
		logResult(bi.abs());
		logResult(bi.bitCount());
		logResult(bi.bitLength());
		logResult(bi.byteValue());
		logResult(bi.getLowestSetBit());
		logResult(bi.intValue());
		logResult(bi.negate());
		logResult(bi.not());
		logResult(bi.shortValue());
		logResult(bi.signum());
		logResult(bi.toByteArray());
		logResult(bi.toString());

		int bitLen = bi.bitLength();
		for (int i = -1; i <= bitLen + 2; ++i) {
			try {
				logResult(bi.clearBit(i));
			} catch (ArithmeticException e) {
				logResult(e);
			}
			try {
				logResult(bi.flipBit(i));
			} catch (ArithmeticException e) {
				logResult(e);
			}
			try {
				logResult(bi.setBit(i));
			} catch (ArithmeticException e) {
				logResult(e);
			}
			try {
				logResult(bi.testBit(i));
			} catch (ArithmeticException e) {
				logResult(e);
			}
		}
		for (int i = -4; i <= 4; ++i) {
			logResult(bi.shiftLeft(i));
			logResult(bi.shiftRight(i));
			try {
				logResult(bi.pow(i));
			} catch (ArithmeticException e) {
				logResult(e);
			}
		}
		for (int i = Character.MIN_RADIX; i <= Character.MAX_RADIX; ++i) {
			logResult(bi.toString(i));
		}
	}

	private static void runTestsBI(BigInteger v1, BigInteger v2) {
		logResult(v1.add(v2));
		logResult(v1.and(v2));
		logResult(v1.andNot(v2));
		logResult(v1.compareTo(v2));
		try {
			logResult(v1.divide(v2));
		} catch (ArithmeticException e) {
			logResult(e);
		}
		try {
			logResult(v1.divideAndRemainder(v2));
		} catch (ArithmeticException e) {
			logResult(e);
		}
		logResult(v1.gcd(v2));
		logResult(v1.max(v2));
		logResult(v1.min(v2));
		try {
			logResult(v1.mod(v2));
		} catch (ArithmeticException e) {
			logResult(e);
		}
		logResult(v1.multiply(v2));
		logResult(v1.or(v2));
		try {
			logResult(v1.remainder(v2));
		} catch (ArithmeticException e) {
			logResult(e);
		}
		logResult(v1.subtract(v2));
		logResult(v1.xor(v2));

		// TODO: modInverse (not performed because it is slow in javascript/jsbn)
		// TODO: isProbablePrime, modPow, nextProbablePrime
	}

	private static void runTestsPair(BigInteger v1, BigInteger v2) {
		runTestsBI(v1, v2);
		runTestsBI(v2, v1);
	}

	private static void runTests2(BigInteger v1, BigInteger v2) {
		runTestsPair(v1, v2);
		runTestsPair(v1, v2.negate());
		runTestsPair(v1.negate(), v2);
		runTestsPair(v1.negate(), v2.negate());
	}

	private static void runTestsBI() {
		String[] vals = {"0",
			"0.01234", "0.1234", "1", "-1.234", "10", "1000", "123.000", "+1230e-121", "123.000e2", "123.456", "1e-1", "1e-2", "1e-3", "1e1", "1e2", "1e3",
			"85", "8765", "95", "10",
			"9007199254740991", "9223372036854775807", "9223372036854775808", "9223372036854775809", "12345678901234567890123456789012345678901234567890",
			"12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890"
		};

		for (int i = 0; i < vals.length; ++i) {
			var bi1 = new BigDecimal(vals[i]).toBigInteger();
			runTestsSolo(bi1);
			runTestsSolo(bi1.negate());
			for (int j = 0; j < vals.length; ++j) {
				var bi2 = new BigDecimal(vals[j]).toBigInteger();
				runTests2(bi1, bi2);
			}
		}
	}


	private static void runTestsInt(BigDecimal bd, int n) {
		logResult(bd.movePointLeft(n));
		logResult(bd.movePointRight(n));
		try {
			logResult(bd.pow(n));
		} catch (ArithmeticException e) {
			logResult(e);
		}
		logResult(bd.scaleByPowerOfTen(n));
	}

	private static RoundingMode[] RMs = {RoundingMode.UP, RoundingMode.DOWN, RoundingMode.CEILING, RoundingMode.FLOOR, RoundingMode.HALF_UP, RoundingMode.HALF_DOWN, RoundingMode.HALF_EVEN, RoundingMode.UNNECESSARY};

	private static void runTestsSolo(BigDecimal bd) {
		logResult(bd.abs());
		logResult(bd.byteValue());
		try {
			logResult(bd.byteValueExact());
		} catch (ArithmeticException e) {
			logResult(e);
		}
		logResult(bd.intValue());
		try {
			logResult(bd.intValueExact());
		} catch (ArithmeticException e) {
			logResult(e);
		}
		logResult(bd.negate());
		logResult(bd.precision());
		//logResult(bd.scale());
		logResult(bd.shortValue());
		try {
			logResult(bd.shortValueExact());
		} catch (ArithmeticException e) {
			logResult(e);
		}
		logResult(bd.signum());
		logResult(bd.stripTrailingZeros());
		logResult(bd.toBigInteger());
		try {
			logResult(bd.toBigIntegerExact());
		} catch (ArithmeticException e) {
			logResult(e);
		}
		logResult(bd.toEngineeringString());
		logResult(bd.toPlainString());
		logResult(bd.toString());
		logResult(bd.ulp());
		//logResult(bd.unscaledValue());
		for (int i = -3; i < 3; ++i) {
			runTestsInt(bd, i);
			try {
				logResult(bd.setScale(bd.scale() + i));
			} catch (ArithmeticException e) {
				logResult(e);
			}
			for (int j = 0; j < RMs.length; ++j) {
				try {
					logResult(bd.setScale(bd.scale() + i, RMs[j]));
				} catch (ArithmeticException e) {
					logResult(e);
				}
			}
		}
	}

	private static void runTestsBD(BigDecimal o, BigDecimal bd) {
		logResult(o.add(bd));
		logResult(o.compareTo(bd));

		for (int i = 0; i < RMs.length; ++i) {
			try {
				logResult(o.divide(bd, RMs[i]));
			} catch (ArithmeticException e) {
				logResult(e);
			}
		}
		for (int j = -3; j <= 3; ++j) {
			for (int i = 0; i < RMs.length; ++i) {
				try {
					logResult(o.divide(bd, o.scale() + j, RMs[i]));
				} catch (ArithmeticException e) {
					logResult(e);
				}
			}
		}

		try {
			logResult(o.divide(bd));
		} catch (ArithmeticException e) {
			logResult(e);
		}
		try {
			logResult(o.divideAndRemainder(bd));
		} catch (ArithmeticException e) {
			logResult(e);
		}
		try {
			logResult(o.divideToIntegralValue(bd));
		} catch (ArithmeticException e) {
			logResult(e);
		}

		logResult(o.equals(bd));
		logResult(o.max(bd));
		logResult(o.min(bd));
		logResult(o.multiply(bd));

		try {
			logResult(o.remainder(bd));
		} catch (ArithmeticException e) {
			logResult(e);
		}

		logResult(o.subtract(bd));
	}

	private static void runTestsPair(BigDecimal bd1, BigDecimal bd2) {
		runTestsBD(bd1, bd2);
		runTestsBD(bd2, bd1);
	}

	private static void runTests2(BigDecimal bd1, BigDecimal bd2) {
		runTestsPair(bd1, bd2);
		runTestsPair(bd1, bd2.negate());
		runTestsPair(bd1.negate(), bd2);
		runTestsPair(bd1.negate(), bd2.negate());
	}

	private static void runTests() {
		String[] vals = {"0", "0e3", "0e-3", "0e6", "0e-6", "0e7", "0e-7", "0e8", "0e-8", "0e9", "0e-9", "0E+45", "0e-45",
			"0.01234", "0.1234", "1", "-1.234", "10", "1000", "123.000", "+1230e-121", "1230e121", "123.000e2", "123.456", "1e-1", "1e-2", "1e-3", "1e1", "1e2", "1e3",
			"85", "8765", "95", "10",
			"9007199254740991", "9223372036854775807", "9223372036854775808", "9223372036854775809", "12345678901234567890123456789012345678901234567890",
			"12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890e12"
		};

		for (int i = 0; i < vals.length; ++i) {
			runTestsSolo(new BigDecimal(vals[i]));
			runTestsSolo(new BigDecimal(vals[i]).negate());
			for (int j = 0; j < vals.length; ++j) {
				runTests2(new BigDecimal(vals[i]), new BigDecimal(vals[j]));
			}
		}
	}

	public static void main(String[] args) throws SecurityException, IllegalArgumentException, IOException {
		if (args.length == 3 && args[0].equals("--compare")) {
			long successCount = 0;
			long failedCount = 0;
			BufferedReader lr1 = new BufferedReader(new FileReader(args[1]));
			BufferedReader lr2 = new BufferedReader(new FileReader(args[2]));
			while (true) {
				String op = lr1.readLine();
				String res2 = lr2.readLine();
				if (op == null) {
					if (res2 != null) {
						throw new RuntimeException("file terminated early");
					}
					break;
				}
				String res1 = lr1.readLine();
				if (!res1.equals(res2)) {
					System.err.println("Op failed: " + op + "; " + res1 + " != " + res2);
					//System.exit(1);
					++failedCount;
				} else {
					++successCount;
				}
			}
			System.out.println(successCount + " tests succeeded");
			System.out.println(failedCount + " tests failed");
			System.exit(failedCount != 0 ? 1 : 0);
		}

		if (args.length == 1 && args[0].equals("--BigInteger")) {
			runTestsBI();
		} else {
			runTests();
		}
	}
}
