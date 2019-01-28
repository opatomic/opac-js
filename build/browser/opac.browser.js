// Bundled source code for opatomic client. see https://github.com/opatomic/opac-js for more info
(function(){
"use strict";

/**
 * @param {number} l
 * @return {!Uint8Array}
 */
var NEWBUF = function(l) {
	return new Uint8Array(l);
}

var ENCODER = new TextEncoder("utf-8");

/**
 * @param {!string} s
 * @return {!Uint8Array}
 */
var STRENC = function(s) {
	return ENCODER.encode(s);
}

var DECODER = new TextDecoder("utf-8");

/**
 * @param {!Uint8Array} b
 * @return {!string}
 */
var STRDEC = function(b) {
	return DECODER.decode(b);
}

var BTOA = window.btoa;

// BigInteger (http://www-cs-students.stanford.edu/~tjw/jsbn/):
/*
Licensing
---------

This software is covered under the following copyright:

 * Copyright (c) 2003-2005  Tom Wu
 * All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
 * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
 * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
 *
 * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
 * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
 * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
 * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
 * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * In addition, the following condition applies:
 *
 * All redistributions must retain an intact copy of this copyright notice
 * and disclaimer.

Address all questions regarding this license to:

  Tom Wu
  tjw@cs.Stanford.EDU
*/

var BigInteger = (function(){
// Copyright (c) 2005  Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Basic JavaScript BN library - subset useful for RSA encryption.

// Bits per digit
var dbits;

// JavaScript engine analysis
var canary = 0xdeadbeefcafe;
var j_lm = ((canary&0xffffff)==0xefcafe);

// (public) Constructor
function BigInteger(a,b,c) {
  if(a != null)
    if("number" == typeof a) this.fromNumber(a,b,c);
    else if(b == null && "string" != typeof a) this.fromString(a,256);
    else this.fromString(a,b);
}

// return new, unset BigInteger
function nbi() { return new BigInteger(null); }

// am: Compute w_j += (x*this_i), propagate carries,
// c is initial carry, returns final carry.
// c < 3*dvalue, x < 2*dvalue, this_i < dvalue
// We need to select the fastest one that works in this environment.

// am1: use a single mult and divide to get the high bits,
// max digit bits should be 26 because
// max internal value = 2*dvalue^2-2*dvalue (< 2^53)
function am1(i,x,w,j,c,n) {
  while(--n >= 0) {
    var v = x*this[i++]+w[j]+c;
    c = Math.floor(v/0x4000000);
    w[j++] = v&0x3ffffff;
  }
  return c;
}
// am2 avoids a big mult-and-extract completely.
// Max digit bits should be <= 30 because we do bitwise ops
// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
function am2(i,x,w,j,c,n) {
  var xl = x&0x7fff, xh = x>>15;
  while(--n >= 0) {
    var l = this[i]&0x7fff;
    var h = this[i++]>>15;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
    c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
    w[j++] = l&0x3fffffff;
  }
  return c;
}
// Alternately, set max digit bits to 28 since some
// browsers slow down when dealing with 32-bit numbers.
function am3(i,x,w,j,c,n) {
  var xl = x&0x3fff, xh = x>>14;
  while(--n >= 0) {
    var l = this[i]&0x3fff;
    var h = this[i++]>>14;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x3fff)<<14)+w[j]+c;
    c = (l>>28)+(m>>14)+xh*h;
    w[j++] = l&0xfffffff;
  }
  return c;
}
if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
  BigInteger.prototype.am = am2;
  dbits = 30;
}
else if(j_lm && (navigator.appName != "Netscape")) {
  BigInteger.prototype.am = am1;
  dbits = 26;
}
else { // Mozilla/Netscape seems to prefer am3
  BigInteger.prototype.am = am3;
  dbits = 28;
}

BigInteger.prototype.DB = dbits;
BigInteger.prototype.DM = ((1<<dbits)-1);
BigInteger.prototype.DV = (1<<dbits);

var BI_FP = 52;
BigInteger.prototype.FV = Math.pow(2,BI_FP);
BigInteger.prototype.F1 = BI_FP-dbits;
BigInteger.prototype.F2 = 2*dbits-BI_FP;

// Digit conversions
var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
var BI_RC = new Array();
var rr,vv;
rr = "0".charCodeAt(0);
for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
rr = "a".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
rr = "A".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

function int2char(n) { return BI_RM.charAt(n); }
function intAt(s,i) {
  var c = BI_RC[s.charCodeAt(i)];
  return (c==null)?-1:c;
}

// (protected) copy this to r
function bnpCopyTo(r) {
  for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
  r.t = this.t;
  r.s = this.s;
}

// (protected) set from integer value x, -DV <= x < DV
function bnpFromInt(x) {
  this.t = 1;
  this.s = (x<0)?-1:0;
  if(x > 0) this[0] = x;
  else if(x < -1) this[0] = x+this.DV;
  else this.t = 0;
}

// return bigint initialized to value
function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

// (protected) set from string and radix
function bnpFromString(s,b) {
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 256) k = 8; // byte array
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else { this.fromRadix(s,b); return; }
  this.t = 0;
  this.s = 0;
  var i = s.length, mi = false, sh = 0;
  while(--i >= 0) {
    var x = (k==8)?s[i]&0xff:intAt(s,i);
    if(x < 0) {
      if(s.charAt(i) == "-") mi = true;
      continue;
    }
    mi = false;
    if(sh == 0)
      this[this.t++] = x;
    else if(sh+k > this.DB) {
      this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
      this[this.t++] = (x>>(this.DB-sh));
    }
    else
      this[this.t-1] |= x<<sh;
    sh += k;
    if(sh >= this.DB) sh -= this.DB;
  }
  if(k == 8 && (s[0]&0x80) != 0) {
    this.s = -1;
    if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
  }
  this.clamp();
  if(mi) BigInteger.ZERO.subTo(this,this);
}

// (protected) clamp off excess high words
function bnpClamp() {
  var c = this.s&this.DM;
  while(this.t > 0 && this[this.t-1] == c) --this.t;
}

// (public) return string representation in given radix
function bnToString(b) {
  if(this.s < 0) return "-"+this.negate().toString(b);
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else return this.toRadix(b);
  var km = (1<<k)-1, d, m = false, r = "", i = this.t;
  var p = this.DB-(i*this.DB)%k;
  if(i-- > 0) {
    if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
    while(i >= 0) {
      if(p < k) {
        d = (this[i]&((1<<p)-1))<<(k-p);
        d |= this[--i]>>(p+=this.DB-k);
      }
      else {
        d = (this[i]>>(p-=k))&km;
        if(p <= 0) { p += this.DB; --i; }
      }
      if(d > 0) m = true;
      if(m) r += int2char(d);
    }
  }
  return m?r:"0";
}

// (public) -this
function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

// (public) |this|
function bnAbs() { return (this.s<0)?this.negate():this; }

// (public) return + if this > a, - if this < a, 0 if equal
function bnCompareTo(a) {
  var r = this.s-a.s;
  if(r != 0) return r;
  var i = this.t;
  r = i-a.t;
  if(r != 0) return (this.s<0)?-r:r;
  while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
  return 0;
}

// returns bit length of the integer x
function nbits(x) {
  var r = 1, t;
  if((t=x>>>16) != 0) { x = t; r += 16; }
  if((t=x>>8) != 0) { x = t; r += 8; }
  if((t=x>>4) != 0) { x = t; r += 4; }
  if((t=x>>2) != 0) { x = t; r += 2; }
  if((t=x>>1) != 0) { x = t; r += 1; }
  return r;
}

// (public) return the number of bits in "this"
function bnBitLength() {
  if(this.t <= 0) return 0;
  return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
}

// (protected) r = this << n*DB
function bnpDLShiftTo(n,r) {
  var i;
  for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
  for(i = n-1; i >= 0; --i) r[i] = 0;
  r.t = this.t+n;
  r.s = this.s;
}

// (protected) r = this >> n*DB
function bnpDRShiftTo(n,r) {
  for(var i = n; i < this.t; ++i) r[i-n] = this[i];
  r.t = Math.max(this.t-n,0);
  r.s = this.s;
}

// (protected) r = this << n
function bnpLShiftTo(n,r) {
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<cbs)-1;
  var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
  for(i = this.t-1; i >= 0; --i) {
    r[i+ds+1] = (this[i]>>cbs)|c;
    c = (this[i]&bm)<<bs;
  }
  for(i = ds-1; i >= 0; --i) r[i] = 0;
  r[ds] = c;
  r.t = this.t+ds+1;
  r.s = this.s;
  r.clamp();
}

// (protected) r = this >> n
function bnpRShiftTo(n,r) {
  r.s = this.s;
  var ds = Math.floor(n/this.DB);
  if(ds >= this.t) { r.t = 0; return; }
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<bs)-1;
  r[0] = this[ds]>>bs;
  for(var i = ds+1; i < this.t; ++i) {
    r[i-ds-1] |= (this[i]&bm)<<cbs;
    r[i-ds] = this[i]>>bs;
  }
  if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
  r.t = this.t-ds;
  r.clamp();
}

// (protected) r = this - a
function bnpSubTo(a,r) {
  var i = 0, c = 0, m = Math.min(a.t,this.t);
  while(i < m) {
    c += this[i]-a[i];
    r[i++] = c&this.DM;
    c >>= this.DB;
  }
  if(a.t < this.t) {
    c -= a.s;
    while(i < this.t) {
      c += this[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += this.s;
  }
  else {
    c += this.s;
    while(i < a.t) {
      c -= a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c -= a.s;
  }
  r.s = (c<0)?-1:0;
  if(c < -1) r[i++] = this.DV+c;
  else if(c > 0) r[i++] = c;
  r.t = i;
  r.clamp();
}

// (protected) r = this * a, r != this,a (HAC 14.12)
// "this" should be the larger one if appropriate.
function bnpMultiplyTo(a,r) {
  var x = this.abs(), y = a.abs();
  var i = x.t;
  r.t = i+y.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
  r.s = 0;
  r.clamp();
  if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
}

// (protected) r = this^2, r != this (HAC 14.16)
function bnpSquareTo(r) {
  var x = this.abs();
  var i = r.t = 2*x.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < x.t-1; ++i) {
    var c = x.am(i,x[i],r,2*i,0,1);
    if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
      r[i+x.t] -= x.DV;
      r[i+x.t+1] = 1;
    }
  }
  if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
  r.s = 0;
  r.clamp();
}

// (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
// r != q, this != m.  q or r may be null.
function bnpDivRemTo(m,q,r) {
  var pm = m.abs();
  if(pm.t <= 0) return;
  var pt = this.abs();
  if(pt.t < pm.t) {
    if(q != null) q.fromInt(0);
    if(r != null) this.copyTo(r);
    return;
  }
  if(r == null) r = nbi();
  var y = nbi(), ts = this.s, ms = m.s;
  var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
  if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
  else { pm.copyTo(y); pt.copyTo(r); }
  var ys = y.t;
  var y0 = y[ys-1];
  if(y0 == 0) return;
  var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
  var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
  var i = r.t, j = i-ys, t = (q==null)?nbi():q;
  y.dlShiftTo(j,t);
  if(r.compareTo(t) >= 0) {
    r[r.t++] = 1;
    r.subTo(t,r);
  }
  BigInteger.ONE.dlShiftTo(ys,t);
  t.subTo(y,y);	// "negative" y so we can replace sub with am later
  while(y.t < ys) y[y.t++] = 0;
  while(--j >= 0) {
    // Estimate quotient digit
    var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
    if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
      y.dlShiftTo(j,t);
      r.subTo(t,r);
      while(r[i] < --qd) r.subTo(t,r);
    }
  }
  if(q != null) {
    r.drShiftTo(ys,q);
    if(ts != ms) BigInteger.ZERO.subTo(q,q);
  }
  r.t = ys;
  r.clamp();
  if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
  if(ts < 0) BigInteger.ZERO.subTo(r,r);
}

// (public) this mod a
function bnMod(a) {
  var r = nbi();
  this.abs().divRemTo(a,null,r);
  if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
  return r;
}

// Modular reduction using "classic" algorithm
function Classic(m) { this.m = m; }
function cConvert(x) {
  if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
  else return x;
}
function cRevert(x) { return x; }
function cReduce(x) { x.divRemTo(this.m,null,x); }
function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

Classic.prototype.convert = cConvert;
Classic.prototype.revert = cRevert;
Classic.prototype.reduce = cReduce;
Classic.prototype.mulTo = cMulTo;
Classic.prototype.sqrTo = cSqrTo;

// (protected) return "-1/this % 2^DB"; useful for Mont. reduction
// justification:
//         xy == 1 (mod m)
//         xy =  1+km
//   xy(2-xy) = (1+km)(1-km)
// x[y(2-xy)] = 1-k^2m^2
// x[y(2-xy)] == 1 (mod m^2)
// if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
// should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
// JS multiply "overflows" differently from C/C++, so care is needed here.
function bnpInvDigit() {
  if(this.t < 1) return 0;
  var x = this[0];
  if((x&1) == 0) return 0;
  var y = x&3;		// y == 1/x mod 2^2
  y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
  y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
  y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
  // last step - calculate inverse mod DV directly;
  // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
  y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
  // we really want the negative inverse, and -DV < y < DV
  return (y>0)?this.DV-y:-y;
}

// Montgomery reduction
function Montgomery(m) {
  this.m = m;
  this.mp = m.invDigit();
  this.mpl = this.mp&0x7fff;
  this.mph = this.mp>>15;
  this.um = (1<<(m.DB-15))-1;
  this.mt2 = 2*m.t;
}

// xR mod m
function montConvert(x) {
  var r = nbi();
  x.abs().dlShiftTo(this.m.t,r);
  r.divRemTo(this.m,null,r);
  if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
  return r;
}

// x/R mod m
function montRevert(x) {
  var r = nbi();
  x.copyTo(r);
  this.reduce(r);
  return r;
}

// x = x/R mod m (HAC 14.32)
function montReduce(x) {
  while(x.t <= this.mt2)	// pad x so am has enough room later
    x[x.t++] = 0;
  for(var i = 0; i < this.m.t; ++i) {
    // faster way of calculating u0 = x[i]*mp mod DV
    var j = x[i]&0x7fff;
    var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
    // use am to combine the multiply-shift-add into one call
    j = i+this.m.t;
    x[j] += this.m.am(0,u0,x,i,0,this.m.t);
    // propagate carry
    while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
  }
  x.clamp();
  x.drShiftTo(this.m.t,x);
  if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
}

// r = "x^2/R mod m"; x != r
function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

// r = "xy/R mod m"; x,y != r
function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

Montgomery.prototype.convert = montConvert;
Montgomery.prototype.revert = montRevert;
Montgomery.prototype.reduce = montReduce;
Montgomery.prototype.mulTo = montMulTo;
Montgomery.prototype.sqrTo = montSqrTo;

// (protected) true iff this is even
function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

// (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
function bnpExp(e,z) {
  if(e > 0xffffffff || e < 1) return BigInteger.ONE;
  var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
  g.copyTo(r);
  while(--i >= 0) {
    z.sqrTo(r,r2);
    if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
    else { var t = r; r = r2; r2 = t; }
  }
  return z.revert(r);
}

// (public) this^e % m, 0 <= e < 2^32
function bnModPowInt(e,m) {
  var z;
  if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
  return this.exp(e,z);
}

// protected
BigInteger.prototype.copyTo = bnpCopyTo;
BigInteger.prototype.fromInt = bnpFromInt;
BigInteger.prototype.fromString = bnpFromString;
BigInteger.prototype.clamp = bnpClamp;
BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
BigInteger.prototype.drShiftTo = bnpDRShiftTo;
BigInteger.prototype.lShiftTo = bnpLShiftTo;
BigInteger.prototype.rShiftTo = bnpRShiftTo;
BigInteger.prototype.subTo = bnpSubTo;
BigInteger.prototype.multiplyTo = bnpMultiplyTo;
BigInteger.prototype.squareTo = bnpSquareTo;
BigInteger.prototype.divRemTo = bnpDivRemTo;
BigInteger.prototype.invDigit = bnpInvDigit;
BigInteger.prototype.isEven = bnpIsEven;
BigInteger.prototype.exp = bnpExp;

// public
BigInteger.prototype.toString = bnToString;
BigInteger.prototype.negate = bnNegate;
BigInteger.prototype.abs = bnAbs;
BigInteger.prototype.compareTo = bnCompareTo;
BigInteger.prototype.bitLength = bnBitLength;
BigInteger.prototype.mod = bnMod;
BigInteger.prototype.modPowInt = bnModPowInt;

// "constants"
BigInteger.ZERO = nbv(0);
BigInteger.ONE = nbv(1);
// Copyright (c) 2005-2009  Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Extended JavaScript BN functions, required for RSA private ops.

// Version 1.1: new BigInteger("0", 10) returns "proper" zero
// Version 1.2: square() API, isProbablePrime fix

// (public)
function bnClone() { var r = nbi(); this.copyTo(r); return r; }

// (public) return value as integer
function bnIntValue() {
  if(this.s < 0) {
    if(this.t == 1) return this[0]-this.DV;
    else if(this.t == 0) return -1;
  }
  else if(this.t == 1) return this[0];
  else if(this.t == 0) return 0;
  // assumes 16 < DB < 32
  return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
}

// (public) return value as byte
function bnByteValue() { return (this.t==0)?this.s:(this[0]<<24)>>24; }

// (public) return value as short (assumes DB>=16)
function bnShortValue() { return (this.t==0)?this.s:(this[0]<<16)>>16; }

// (protected) return x s.t. r^x < DV
function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

// (public) 0 if this == 0, 1 if this > 0
function bnSigNum() {
  if(this.s < 0) return -1;
  else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
  else return 1;
}

// (protected) convert to radix string
function bnpToRadix(b) {
  if(b == null) b = 10;
  if(this.signum() == 0 || b < 2 || b > 36) return "0";
  var cs = this.chunkSize(b);
  var a = Math.pow(b,cs);
  var d = nbv(a), y = nbi(), z = nbi(), r = "";
  this.divRemTo(d,y,z);
  while(y.signum() > 0) {
    r = (a+z.intValue()).toString(b).substr(1) + r;
    y.divRemTo(d,y,z);
  }
  return z.intValue().toString(b) + r;
}

// (protected) convert from radix string
function bnpFromRadix(s,b) {
  this.fromInt(0);
  if(b == null) b = 10;
  var cs = this.chunkSize(b);
  var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
  for(var i = 0; i < s.length; ++i) {
    var x = intAt(s,i);
    if(x < 0) {
      if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
      continue;
    }
    w = b*w+x;
    if(++j >= cs) {
      this.dMultiply(d);
      this.dAddOffset(w,0);
      j = 0;
      w = 0;
    }
  }
  if(j > 0) {
    this.dMultiply(Math.pow(b,j));
    this.dAddOffset(w,0);
  }
  if(mi) BigInteger.ZERO.subTo(this,this);
}

// (protected) alternate constructor
function bnpFromNumber(a,b,c) {
  if("number" == typeof b) {
    // new BigInteger(int,int,RNG)
    if(a < 2) this.fromInt(1);
    else {
      this.fromNumber(a,c);
      if(!this.testBit(a-1))	// force MSB set
        this.bitwiseTo(BigInteger.ONE.shiftLeft(a-1),op_or,this);
      if(this.isEven()) this.dAddOffset(1,0); // force odd
      while(!this.isProbablePrime(b)) {
        this.dAddOffset(2,0);
        if(this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a-1),this);
      }
    }
  }
  else {
    // new BigInteger(int,RNG)
    var x = new Array(), t = a&7;
    x.length = (a>>3)+1;
    b.nextBytes(x);
    if(t > 0) x[0] &= ((1<<t)-1); else x[0] = 0;
    this.fromString(x,256);
  }
}

// (public) convert to bigendian byte array
function bnToByteArray() {
  var i = this.t, r = new Array();
  r[0] = this.s;
  var p = this.DB-(i*this.DB)%8, d, k = 0;
  if(i-- > 0) {
    if(p < this.DB && (d = this[i]>>p) != (this.s&this.DM)>>p)
      r[k++] = d|(this.s<<(this.DB-p));
    while(i >= 0) {
      if(p < 8) {
        d = (this[i]&((1<<p)-1))<<(8-p);
        d |= this[--i]>>(p+=this.DB-8);
      }
      else {
        d = (this[i]>>(p-=8))&0xff;
        if(p <= 0) { p += this.DB; --i; }
      }
      if((d&0x80) != 0) d |= -256;
      if(k == 0 && (this.s&0x80) != (d&0x80)) ++k;
      if(k > 0 || d != this.s) r[k++] = d;
    }
  }
  return r;
}

function bnEquals(a) { return(this.compareTo(a)==0); }
function bnMin(a) { return(this.compareTo(a)<0)?this:a; }
function bnMax(a) { return(this.compareTo(a)>0)?this:a; }

// (protected) r = this op a (bitwise)
function bnpBitwiseTo(a,op,r) {
  var i, f, m = Math.min(a.t,this.t);
  for(i = 0; i < m; ++i) r[i] = op(this[i],a[i]);
  if(a.t < this.t) {
    f = a.s&this.DM;
    for(i = m; i < this.t; ++i) r[i] = op(this[i],f);
    r.t = this.t;
  }
  else {
    f = this.s&this.DM;
    for(i = m; i < a.t; ++i) r[i] = op(f,a[i]);
    r.t = a.t;
  }
  r.s = op(this.s,a.s);
  r.clamp();
}

// (public) this & a
function op_and(x,y) { return x&y; }
function bnAnd(a) { var r = nbi(); this.bitwiseTo(a,op_and,r); return r; }

// (public) this | a
function op_or(x,y) { return x|y; }
function bnOr(a) { var r = nbi(); this.bitwiseTo(a,op_or,r); return r; }

// (public) this ^ a
function op_xor(x,y) { return x^y; }
function bnXor(a) { var r = nbi(); this.bitwiseTo(a,op_xor,r); return r; }

// (public) this & ~a
function op_andnot(x,y) { return x&~y; }
function bnAndNot(a) { var r = nbi(); this.bitwiseTo(a,op_andnot,r); return r; }

// (public) ~this
function bnNot() {
  var r = nbi();
  for(var i = 0; i < this.t; ++i) r[i] = this.DM&~this[i];
  r.t = this.t;
  r.s = ~this.s;
  return r;
}

// (public) this << n
function bnShiftLeft(n) {
  var r = nbi();
  if(n < 0) this.rShiftTo(-n,r); else this.lShiftTo(n,r);
  return r;
}

// (public) this >> n
function bnShiftRight(n) {
  var r = nbi();
  if(n < 0) this.lShiftTo(-n,r); else this.rShiftTo(n,r);
  return r;
}

// return index of lowest 1-bit in x, x < 2^31
function lbit(x) {
  if(x == 0) return -1;
  var r = 0;
  if((x&0xffff) == 0) { x >>= 16; r += 16; }
  if((x&0xff) == 0) { x >>= 8; r += 8; }
  if((x&0xf) == 0) { x >>= 4; r += 4; }
  if((x&3) == 0) { x >>= 2; r += 2; }
  if((x&1) == 0) ++r;
  return r;
}

// (public) returns index of lowest 1-bit (or -1 if none)
function bnGetLowestSetBit() {
  for(var i = 0; i < this.t; ++i)
    if(this[i] != 0) return i*this.DB+lbit(this[i]);
  if(this.s < 0) return this.t*this.DB;
  return -1;
}

// return number of 1 bits in x
function cbit(x) {
  var r = 0;
  while(x != 0) { x &= x-1; ++r; }
  return r;
}

// (public) return number of set bits
function bnBitCount() {
  var r = 0, x = this.s&this.DM;
  for(var i = 0; i < this.t; ++i) r += cbit(this[i]^x);
  return r;
}

// (public) true iff nth bit is set
function bnTestBit(n) {
  var j = Math.floor(n/this.DB);
  if(j >= this.t) return(this.s!=0);
  return((this[j]&(1<<(n%this.DB)))!=0);
}

// (protected) this op (1<<n)
function bnpChangeBit(n,op) {
  var r = BigInteger.ONE.shiftLeft(n);
  this.bitwiseTo(r,op,r);
  return r;
}

// (public) this | (1<<n)
function bnSetBit(n) { return this.changeBit(n,op_or); }

// (public) this & ~(1<<n)
function bnClearBit(n) { return this.changeBit(n,op_andnot); }

// (public) this ^ (1<<n)
function bnFlipBit(n) { return this.changeBit(n,op_xor); }

// (protected) r = this + a
function bnpAddTo(a,r) {
  var i = 0, c = 0, m = Math.min(a.t,this.t);
  while(i < m) {
    c += this[i]+a[i];
    r[i++] = c&this.DM;
    c >>= this.DB;
  }
  if(a.t < this.t) {
    c += a.s;
    while(i < this.t) {
      c += this[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += this.s;
  }
  else {
    c += this.s;
    while(i < a.t) {
      c += a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += a.s;
  }
  r.s = (c<0)?-1:0;
  if(c > 0) r[i++] = c;
  else if(c < -1) r[i++] = this.DV+c;
  r.t = i;
  r.clamp();
}

// (public) this + a
function bnAdd(a) { var r = nbi(); this.addTo(a,r); return r; }

// (public) this - a
function bnSubtract(a) { var r = nbi(); this.subTo(a,r); return r; }

// (public) this * a
function bnMultiply(a) { var r = nbi(); this.multiplyTo(a,r); return r; }

// (public) this^2
function bnSquare() { var r = nbi(); this.squareTo(r); return r; }

// (public) this / a
function bnDivide(a) { var r = nbi(); this.divRemTo(a,r,null); return r; }

// (public) this % a
function bnRemainder(a) { var r = nbi(); this.divRemTo(a,null,r); return r; }

// (public) [this/a,this%a]
function bnDivideAndRemainder(a) {
  var q = nbi(), r = nbi();
  this.divRemTo(a,q,r);
  return new Array(q,r);
}

// (protected) this *= n, this >= 0, 1 < n < DV
function bnpDMultiply(n) {
  this[this.t] = this.am(0,n-1,this,0,0,this.t);
  ++this.t;
  this.clamp();
}

// (protected) this += n << w words, this >= 0
function bnpDAddOffset(n,w) {
  if(n == 0) return;
  while(this.t <= w) this[this.t++] = 0;
  this[w] += n;
  while(this[w] >= this.DV) {
    this[w] -= this.DV;
    if(++w >= this.t) this[this.t++] = 0;
    ++this[w];
  }
}

// A "null" reducer
function NullExp() {}
function nNop(x) { return x; }
function nMulTo(x,y,r) { x.multiplyTo(y,r); }
function nSqrTo(x,r) { x.squareTo(r); }

NullExp.prototype.convert = nNop;
NullExp.prototype.revert = nNop;
NullExp.prototype.mulTo = nMulTo;
NullExp.prototype.sqrTo = nSqrTo;

// (public) this^e
function bnPow(e) { return this.exp(e,new NullExp()); }

// (protected) r = lower n words of "this * a", a.t <= n
// "this" should be the larger one if appropriate.
function bnpMultiplyLowerTo(a,n,r) {
  var i = Math.min(this.t+a.t,n);
  r.s = 0; // assumes a,this >= 0
  r.t = i;
  while(i > 0) r[--i] = 0;
  var j;
  for(j = r.t-this.t; i < j; ++i) r[i+this.t] = this.am(0,a[i],r,i,0,this.t);
  for(j = Math.min(a.t,n); i < j; ++i) this.am(0,a[i],r,i,0,n-i);
  r.clamp();
}

// (protected) r = "this * a" without lower n words, n > 0
// "this" should be the larger one if appropriate.
function bnpMultiplyUpperTo(a,n,r) {
  --n;
  var i = r.t = this.t+a.t-n;
  r.s = 0; // assumes a,this >= 0
  while(--i >= 0) r[i] = 0;
  for(i = Math.max(n-this.t,0); i < a.t; ++i)
    r[this.t+i-n] = this.am(n-i,a[i],r,0,0,this.t+i-n);
  r.clamp();
  r.drShiftTo(1,r);
}

// Barrett modular reduction
function Barrett(m) {
  // setup Barrett
  this.r2 = nbi();
  this.q3 = nbi();
  BigInteger.ONE.dlShiftTo(2*m.t,this.r2);
  this.mu = this.r2.divide(m);
  this.m = m;
}

function barrettConvert(x) {
  if(x.s < 0 || x.t > 2*this.m.t) return x.mod(this.m);
  else if(x.compareTo(this.m) < 0) return x;
  else { var r = nbi(); x.copyTo(r); this.reduce(r); return r; }
}

function barrettRevert(x) { return x; }

// x = x mod m (HAC 14.42)
function barrettReduce(x) {
  x.drShiftTo(this.m.t-1,this.r2);
  if(x.t > this.m.t+1) { x.t = this.m.t+1; x.clamp(); }
  this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3);
  this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);
  while(x.compareTo(this.r2) < 0) x.dAddOffset(1,this.m.t+1);
  x.subTo(this.r2,x);
  while(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
}

// r = x^2 mod m; x != r
function barrettSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

// r = x*y mod m; x,y != r
function barrettMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

Barrett.prototype.convert = barrettConvert;
Barrett.prototype.revert = barrettRevert;
Barrett.prototype.reduce = barrettReduce;
Barrett.prototype.mulTo = barrettMulTo;
Barrett.prototype.sqrTo = barrettSqrTo;

// (public) this^e % m (HAC 14.85)
function bnModPow(e,m) {
  var i = e.bitLength(), k, r = nbv(1), z;
  if(i <= 0) return r;
  else if(i < 18) k = 1;
  else if(i < 48) k = 3;
  else if(i < 144) k = 4;
  else if(i < 768) k = 5;
  else k = 6;
  if(i < 8)
    z = new Classic(m);
  else if(m.isEven())
    z = new Barrett(m);
  else
    z = new Montgomery(m);

  // precomputation
  var g = new Array(), n = 3, k1 = k-1, km = (1<<k)-1;
  g[1] = z.convert(this);
  if(k > 1) {
    var g2 = nbi();
    z.sqrTo(g[1],g2);
    while(n <= km) {
      g[n] = nbi();
      z.mulTo(g2,g[n-2],g[n]);
      n += 2;
    }
  }

  var j = e.t-1, w, is1 = true, r2 = nbi(), t;
  i = nbits(e[j])-1;
  while(j >= 0) {
    if(i >= k1) w = (e[j]>>(i-k1))&km;
    else {
      w = (e[j]&((1<<(i+1))-1))<<(k1-i);
      if(j > 0) w |= e[j-1]>>(this.DB+i-k1);
    }

    n = k;
    while((w&1) == 0) { w >>= 1; --n; }
    if((i -= n) < 0) { i += this.DB; --j; }
    if(is1) {	// ret == 1, don't bother squaring or multiplying it
      g[w].copyTo(r);
      is1 = false;
    }
    else {
      while(n > 1) { z.sqrTo(r,r2); z.sqrTo(r2,r); n -= 2; }
      if(n > 0) z.sqrTo(r,r2); else { t = r; r = r2; r2 = t; }
      z.mulTo(r2,g[w],r);
    }

    while(j >= 0 && (e[j]&(1<<i)) == 0) {
      z.sqrTo(r,r2); t = r; r = r2; r2 = t;
      if(--i < 0) { i = this.DB-1; --j; }
    }
  }
  return z.revert(r);
}

// (public) gcd(this,a) (HAC 14.54)
function bnGCD(a) {
  var x = (this.s<0)?this.negate():this.clone();
  var y = (a.s<0)?a.negate():a.clone();
  if(x.compareTo(y) < 0) { var t = x; x = y; y = t; }
  var i = x.getLowestSetBit(), g = y.getLowestSetBit();
  if(g < 0) return x;
  if(i < g) g = i;
  if(g > 0) {
    x.rShiftTo(g,x);
    y.rShiftTo(g,y);
  }
  while(x.signum() > 0) {
    if((i = x.getLowestSetBit()) > 0) x.rShiftTo(i,x);
    if((i = y.getLowestSetBit()) > 0) y.rShiftTo(i,y);
    if(x.compareTo(y) >= 0) {
      x.subTo(y,x);
      x.rShiftTo(1,x);
    }
    else {
      y.subTo(x,y);
      y.rShiftTo(1,y);
    }
  }
  if(g > 0) y.lShiftTo(g,y);
  return y;
}

// (protected) this % n, n < 2^26
function bnpModInt(n) {
  if(n <= 0) return 0;
  var d = this.DV%n, r = (this.s<0)?n-1:0;
  if(this.t > 0)
    if(d == 0) r = this[0]%n;
    else for(var i = this.t-1; i >= 0; --i) r = (d*r+this[i])%n;
  return r;
}

// (public) 1/this % m (HAC 14.61)
function bnModInverse(m) {
  var ac = m.isEven();
  if((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
  var u = m.clone(), v = this.clone();
  var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
  while(u.signum() != 0) {
    while(u.isEven()) {
      u.rShiftTo(1,u);
      if(ac) {
        if(!a.isEven() || !b.isEven()) { a.addTo(this,a); b.subTo(m,b); }
        a.rShiftTo(1,a);
      }
      else if(!b.isEven()) b.subTo(m,b);
      b.rShiftTo(1,b);
    }
    while(v.isEven()) {
      v.rShiftTo(1,v);
      if(ac) {
        if(!c.isEven() || !d.isEven()) { c.addTo(this,c); d.subTo(m,d); }
        c.rShiftTo(1,c);
      }
      else if(!d.isEven()) d.subTo(m,d);
      d.rShiftTo(1,d);
    }
    if(u.compareTo(v) >= 0) {
      u.subTo(v,u);
      if(ac) a.subTo(c,a);
      b.subTo(d,b);
    }
    else {
      v.subTo(u,v);
      if(ac) c.subTo(a,c);
      d.subTo(b,d);
    }
  }
  if(v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
  if(d.compareTo(m) >= 0) return d.subtract(m);
  if(d.signum() < 0) d.addTo(m,d); else return d;
  if(d.signum() < 0) return d.add(m); else return d;
}

var lowprimes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997];
var lplim = (1<<26)/lowprimes[lowprimes.length-1];

// (public) test primality with certainty >= 1-.5^t
function bnIsProbablePrime(t) {
  var i, x = this.abs();
  if(x.t == 1 && x[0] <= lowprimes[lowprimes.length-1]) {
    for(i = 0; i < lowprimes.length; ++i)
      if(x[0] == lowprimes[i]) return true;
    return false;
  }
  if(x.isEven()) return false;
  i = 1;
  while(i < lowprimes.length) {
    var m = lowprimes[i], j = i+1;
    while(j < lowprimes.length && m < lplim) m *= lowprimes[j++];
    m = x.modInt(m);
    while(i < j) if(m%lowprimes[i++] == 0) return false;
  }
  return x.millerRabin(t);
}

// (protected) true if probably prime (HAC 4.24, Miller-Rabin)
function bnpMillerRabin(t) {
  var n1 = this.subtract(BigInteger.ONE);
  var k = n1.getLowestSetBit();
  if(k <= 0) return false;
  var r = n1.shiftRight(k);
  t = (t+1)>>1;
  if(t > lowprimes.length) t = lowprimes.length;
  var a = nbi();
  for(var i = 0; i < t; ++i) {
    //Pick bases at random, instead of starting at 2
    a.fromInt(lowprimes[Math.floor(Math.random()*lowprimes.length)]);
    var y = a.modPow(r,this);
    if(y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
      var j = 1;
      while(j++ < k && y.compareTo(n1) != 0) {
        y = y.modPowInt(2,this);
        if(y.compareTo(BigInteger.ONE) == 0) return false;
      }
      if(y.compareTo(n1) != 0) return false;
    }
  }
  return true;
}

// protected
BigInteger.prototype.chunkSize = bnpChunkSize;
BigInteger.prototype.toRadix = bnpToRadix;
BigInteger.prototype.fromRadix = bnpFromRadix;
BigInteger.prototype.fromNumber = bnpFromNumber;
BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
BigInteger.prototype.changeBit = bnpChangeBit;
BigInteger.prototype.addTo = bnpAddTo;
BigInteger.prototype.dMultiply = bnpDMultiply;
BigInteger.prototype.dAddOffset = bnpDAddOffset;
BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
BigInteger.prototype.modInt = bnpModInt;
BigInteger.prototype.millerRabin = bnpMillerRabin;

// public
BigInteger.prototype.clone = bnClone;
BigInteger.prototype.intValue = bnIntValue;
BigInteger.prototype.byteValue = bnByteValue;
BigInteger.prototype.shortValue = bnShortValue;
BigInteger.prototype.signum = bnSigNum;
BigInteger.prototype.toByteArray = bnToByteArray;
BigInteger.prototype.equals = bnEquals;
BigInteger.prototype.min = bnMin;
BigInteger.prototype.max = bnMax;
BigInteger.prototype.and = bnAnd;
BigInteger.prototype.or = bnOr;
BigInteger.prototype.xor = bnXor;
BigInteger.prototype.andNot = bnAndNot;
BigInteger.prototype.not = bnNot;
BigInteger.prototype.shiftLeft = bnShiftLeft;
BigInteger.prototype.shiftRight = bnShiftRight;
BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
BigInteger.prototype.bitCount = bnBitCount;
BigInteger.prototype.testBit = bnTestBit;
BigInteger.prototype.setBit = bnSetBit;
BigInteger.prototype.clearBit = bnClearBit;
BigInteger.prototype.flipBit = bnFlipBit;
BigInteger.prototype.add = bnAdd;
BigInteger.prototype.subtract = bnSubtract;
BigInteger.prototype.multiply = bnMultiply;
BigInteger.prototype.divide = bnDivide;
BigInteger.prototype.remainder = bnRemainder;
BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
BigInteger.prototype.modPow = bnModPow;
BigInteger.prototype.modInverse = bnModInverse;
BigInteger.prototype.pow = bnPow;
BigInteger.prototype.gcd = bnGCD;
BigInteger.prototype.isProbablePrime = bnIsProbablePrime;

// JSBN-specific extension
BigInteger.prototype.square = bnSquare;

// BigInteger interfaces not implemented in jsbn:

// BigInteger(int signum, byte[] magnitude)
// double doubleValue()
// float floatValue()
// int hashCode()
// long longValue()
// static BigInteger valueOf(long val)

return BigInteger;
}());


var VERSION = "0.1.29";


/**
 * @classdesc This class is not actually created. It is here to help with type checking.
 * @constructor
 * @extends Array
 * @hideconstructor
 */
function QChunk() {}
/** @type {QChunk} */
QChunk.prototype.next;
/** @type {number} */
QChunk.prototype.head;
/** @type {number} */
QChunk.prototype.used;

/**
 * Queue that allocates arrays in small chunks as needed. Chunks are stored as linked list.
 * This design is efficient because it does not require growing arrays and copying data when
 * capacity is exceeded. Also, large contiguous chunks of memory are not required.
 * If only 1 chunk is needed, then it is utilized as a circular array to avoid constantly
 * reallocating a new chunk.
 * @constructor
 * @template T
 */
function Queue() {
	/** @type {number} */
	this.totlen = 0;
	/** @type {!QChunk} */
	this.head = newQChunk(this.newChunkSize, null);
	/** @type {!QChunk} */
	this.tail = this.head;
}

/**
 * @ignore
 * @param {number} size - size of chunk's array
 * @param {QChunk} prev - link to previous chunk
 * @return {!QChunk}
 */
function newQChunk(size, prev) {
	var c = /** @type {!QChunk} */ (new Array(size));
	c.next = null;
	c.head = 0;
	c.used = 0;
	if (prev) {
		prev.next = c;
	}
	return c;
}

/**
 * Add the specified element to the tail of the queue
 * @param {T} item
 * @return {number} new length after adding item
 */
Queue.prototype.push = function(item) {
	var chunk = this.tail;
	if (chunk.used + 1 >= chunk.length) {
		this.tail = chunk = newQChunk(this.newChunkSize, chunk);
	}
	chunk[(chunk.head + chunk.used) & (chunk.length - 1)] = item;
	chunk.used++;
	return ++this.totlen;
};

/**
 * Remove an item from the head of the queue
 * @return {T} The first item in the queue or undefined if queue is empty
 */
Queue.prototype.shift = function() {
	var chunk = this.head;
	if (chunk.used == 0) {
		return undefined;
	}
	var idx = chunk.head;
	var item = chunk[idx];
	chunk[idx] = undefined;
	chunk.used--;
	if (chunk.used == 0 && chunk.next) {
		this.head = chunk.next;
	} else {
		chunk.head = (idx + 1) & (chunk.length - 1);
	}
	this.totlen--;
	return item;
};

/**
 * @return {number}
 */
Queue.prototype.size = function() {
	return this.totlen;
};

/**
 * size of each new array chunk. must be greater than 0 and a power of 2!
 * @type {number}
 */
Queue.prototype.newChunkSize = 64;

// dependencies: BigInteger

/*
TODO:
 add mathcontext to each op to handle rounding
 divide()
 remainder()
 pow()
 stripTrailingZeros()
 scale()
*/

/**
 * @constructor
 * @param {BigInteger|string} man
 * @param {number=} exp
 */
function BigDec(man, exp) {
	/**
	 * @ignore
	 * @param {!BigDec} v
	 * @param {!string} s
	 */
	function bdFromString(v, s) {
		var decPos = s.indexOf(".");
		var epos = s.indexOf("e");
		if (epos < 0) {
			epos = s.indexOf("E");
		}
		if (epos < 0) {
			v.m = new BigInteger(s);
			v.e = 0;
		} else {
			v.m = new BigInteger(s.substring(0, epos));
			v.e = parseInt(s.substr(epos + 1), 10);
			if (!isSafeInteger(v.e)) {
				throw 'number string "' + s + '" cannot be parsed';
			}
		}
		if (decPos >= 0) {
			v.e -= epos < 0 ? s.length - decPos - 1 : epos - decPos - 1;
		}
	}

	if (typeof man == "string") {
		bdFromString(this, man);
	} else {
		/** @type {!BigInteger} */
		this.m = man ? man : new BigInteger(null);
		/** @type {number} */
		this.e = exp ? exp : 0;
	}
}

(function(){

/**
 * @return {!BigDec}
 */
function nbd() { return new BigDec(new BigInteger(null), 0); }

/**
 * @param {!BigDec} a
 * @param {number} amount
 * @return {!BigDec}
 */
function extend(a, amount) {
	if (amount < 0) {
		throw "invalid extension. must be >= 0";
	} else if (amount == 0) {
		return a;
	}
	// dMultiply() requires a number >= 0. must negate if negative; otherwise clone (since value will be modified)
	var m = a.m.signum() < 0 ? a.m.negate() : a.m.clone();
	for (var i = amount; i > 0; --i) {
		m.dMultiply(10);
	}
	return new BigDec(a.m.signum() < 0 ? m.negate() : m, a.e - amount);
}

/**
 * r = a + b
 * @param {!BigDec} a
 * @param {!BigDec} b
 * @param {!BigDec} r
 */
function add3(a, b, r) {
	if (b.signum() == 0) {
		a.copyTo(r);
	} else if (a.signum() == 0) {
		b.copyTo(r);
	} else {
		if (a.e > b.e) {
			a = extend(a, a.e - b.e);
		} else if (a.e < b.e) {
			b = extend(b, b.e - a.e);
		}
		a.m.addTo(b.m, r.m);
		r.e = r.m.signum() == 0 ? 0 : a.e;
	}
}

/**
 * r = a - b
 * @param {!BigDec} a
 * @param {!BigDec} b
 * @param {!BigDec} r
 */
function sub3(a, b, r) {
	if (b.signum() == 0) {
		a.copyTo(r);
	} else if (a.signum() == 0) {
		BigInteger.ZERO.subTo(b.m, r.m);
		r.e = b.e;
	} else {
		if (a.e > b.e) {
			a = extend(a, a.e - b.e);
		} else if (a.e < b.e) {
			b = extend(b, b.e - a.e);
		}
		a.m.subTo(b.m, r.m);
		r.e = r.m.signum() == 0 ? 0 : a.e;
	}
}

/**
 * r = a * b
 * @param {!BigDec} a
 * @param {!BigDec} b
 * @param {!BigDec} r
 */
function mul3(a, b, r) {
	if (a == r || b == r) {
		// multiplyTo() docs say that result cannot be same object as a or b
		var tmp = r.clone();
		mul3(a, b, tmp);
		tmp.copyTo(r);
	} else if (a.signum() == 0) {
		a.copyTo(r);
	} else if (b.signum() == 0) {
		b.copyTo(r);
	} else {
		if (a.e > b.e) {
			a = extend(a, a.e - b.e);
		} else if (a.e < b.e) {
			b = extend(b, b.e - a.e);
		}

		a.m.multiplyTo(b.m, r.m);
		r.e = r.m.signum() == 0 ? 0 : a.e + b.e;
	}
}

/**
 * q = a / b
 * r = a % b
 * q or r may be null
 * @param {!BigDec} a
 * @param {!BigDec} b
 * @param {BigDec} q
 * @param {BigDec} r
 */
function div(a, b, q, r) {
	if (a == r || b == r) {
		var tmp = r.clone();
		div(a, b, q, tmp);
		tmp.copyTo(r);
	} else if (a == q || b == q) {
		var tmp = q.clone();
		div(a, b, tmp, r);
		tmp.copyTo(q);
	} else if (b.signum() == 0) {
		// TODO: use NaN?
		// actually, can probably define x/0 to be 0. see https://www.hillelwayne.com/post/divide-by-zero/
		throw "cannot divide by 0";
	} else if (a.signum() == 0) {
		if (q) {
			a.copyTo(q);
		}
		if (r) {
			a.copyTo(r);
		}
	} else {
		if (a.e > b.e) {
			a = extend(a, a.e - b.e);
		} else if (a.e < b.e) {
			b = extend(b, b.e - a.e);
		}

		// TODO: is this correct?
		a.m.divRemTo(b.m, q ? q.m : null, r ? r.m : null);
		if (q) {
			q.e = 0;
		}
		if (r) {
			r.e = 0;
		}
	}
}

/**
 * @return {!BigDec}
 */
BigDec.prototype.abs = function() {
	return this.m.signum() < 0 ? new BigDec(this.m.abs(), this.e) : this;
}

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
BigDec.prototype.add = function(b) {
	var r = nbd();
	add3(this, b, r);
	return r;
}

/**
 * @return {!BigDec}
 */
BigDec.prototype.clone = function() {
	return new BigDec(this.m.clone(), this.e);
}

/**
 * @param {!BigDec} b
 * @return {number}
 */
BigDec.prototype.compareTo = function(b) {
	if (this.m.s < 0) {
		if (b.m.s >= 0) {
			return -1;
		}
	} else if (b.m.s < 0) {
		return 1;
	}

	// TODO: if exp's are not equal, can estimate comparison based on number of bits
	//  each power of ten is worth which could prevent having to multiply and extend
	//  a value until exponents are equal
	if (this.e == b.e) {
		return this.m.compareTo(b.m);
	} else if (this.e > b.e) {
		return extend(this, this.e - b.e).compareTo(b);
	} else {
		return this.compareTo(extend(b, b.e - this.e));
	}
}

/**
 * @param {!BigDec} r
 */
BigDec.prototype.copyTo = function(r) {
	this.m.copyTo(r.m);
	r.e = this.e;
}

/*
BigDec.prototype.divideAndRemainder = function(b) {
	var q = nbd();
	var r = nbd();
	div(this, b, q, r);
	return [q, r];
}

BigDec.prototype.equals = function(b) {
	return this.compareTo(b) == 0;
}

BigDec.prototype.max = function(b) {
	return this.compareTo(b) > 0 ? this : b;
}

BigDec.prototype.min = function(b) {
	return this.compareTo(b) < 0 ? this : b;
}
*/

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
BigDec.prototype.multiply = function(b) {
	var r = nbd();
	mul3(this, b, r);
	return r;
}

/**
 * Returns -1 if this value is negative, 1 if positive, else 0 (if this is equal to zero).
 * @return {number}
 */
BigDec.prototype.signum = function() {
	return this.m.signum();
}

/**
 * @param {!BigDec} b
 * @return {!BigDec}
 */
BigDec.prototype.subtract = function(b) {
	var r = nbd();
	sub3(this, b, r);
	return r;
}

/**
 * @return {!string}
 */
BigDec.prototype.toString = function() {
	// TODO: return same string that java returns
	var s = this.m.toString();
	if (this.e != 0) {
		s += "e" + this.e.toString();
	}
	return s;
}

}());


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


// Dependencies: BigInteger, BigDec, OpaDef, NEWBUF, STRDEC

/**
 * @constructor
 */
var PartialParser = function(){};

(function(){

var S_NEXTOBJ = 1;
var S_VARINT1 = 2;
var S_VARINT2 = 3;
var S_VARDEC1 = 4;
var S_VARDEC2 = 5;
var S_BIGINT  = 6;
var S_BIGDEC1 = 7;
var S_BIGDEC2 = 8;
var S_BYTES1  = 9;
var S_BYTES2  = 10;
var S_BLOB    = 11;
var S_STR     = 12;
var S_ERR     = 13;

// note: this temp variable is only used to read varints so it will never store more than a 64 bit integer (low memory)
var TMPBI1 = new BigInteger(null);

/**
 * @constructor
 */
PartialParser = function() {
	/** @type {!Array<*>} */
	this.mContainers = [];
	/** @type {Array} */
	this.mCurrCont = null;
	/** @type {number} */
	this.mState = S_NEXTOBJ;
	/** @type {number} */
	this.mNextState = 0;
	/** @type {number} */
	this.mNextState2 = 0;
	/** @type {!BigInteger|number} */
	this.mVarintVal = 0;
	/** @type {number} */
	this.mVarintMul = 0;
	/** @type {number} */
	this.mVarintBitshift = 0;
	/** @type {number} */
	this.mDecExp = 0;
	/** @type {number} */
	this.mObjType = 0;
	/** @type {number} */
	this.mBytesIdx = 0;
	/** @type {number} */
	this.mBytesLen = 0;
	/** @type {Uint8Array} */
	this.mBytes = null;
}

/**
 * @param {!PartialParser} p
 * @param {!string} msg
 */
function throwErr(p, msg) {
	p.mState = S_ERR;
	throw msg;
}

/**
 * @param {!PartialParser} p
 * @param {*} o
 */
function hitNext(p, o) {
	if (p.mCurrCont == null) {
		throwErr(p, "no array container");
	}
	p.mCurrCont.push(o);
}

/**
 * @param {!PartialParser} p
 * @param {number} objType
 * @param {number} nextState
 */
function initVarint(p, objType, nextState) {
	p.mState = S_VARINT1;
	p.mNextState = nextState;
	p.mObjType = objType;
	p.mVarintVal = 0;
	p.mVarintMul = 1;
	p.mVarintBitshift = 0;
}

/**
 * @param {!PartialParser} p
 * @param {number} objType
 * @param {number} nextState
 */
function initBytes(p, objType, nextState) {
	initVarint(p, objType, S_BYTES1);
	p.mNextState2 = nextState;
}

/**
 * @param {!PartialParser} p
 * @param {boolean} neg
 * @return {number}
 */
function getVarint32(p, neg) {
	if (typeof p.mVarintVal != "number" || p.mVarintVal > 2147483647) {
		throwErr(p, "varint out of range");
	}
	return neg ? 0 - /** @type {number} */ (p.mVarintVal) : /** @type {number} */ (p.mVarintVal);
}

/**
 * @param {boolean} neg
 * @param {number|!BigInteger} v
 * @return {number|!BigInteger}
 */
function getNum(neg, v) {
	if (neg) {
		if (typeof v == "number") {
			return 0 - v;
		} else {
			BigInteger.ZERO.subTo(v, v);
		}
	}
	return v;
}

/**
 * read a byte array in big-endian format that is always positive (does not have a sign bit)
 * custom function similar to bnpFromString(s,256);
 * see also, java constructor: public BigInteger(int signum, byte[] magnitude)
 *   https://docs.oracle.com/javase/7/docs/api/java/math/BigInteger.html#BigInteger(int,%20byte[])
 * @param {!Uint8Array} b
 * @param {number} len
 * @param {!BigInteger} r
 * @return {!BigInteger}
 */
function bigintFromBytes2(b, len, r) {
	r.t = 0;
	r.s = 0;
	var i = len;
	var sh = 0;
	while (--i >= 0) {
		var x = b[i] & 0xff;
		if (sh == 0) {
			r[r.t++] = x;
		} else if (sh + 8 > r.DB) {
			r[r.t - 1] |= (x & ((1 << (r.DB - sh)) - 1)) << sh;
			r[r.t++] = (x >> (r.DB - sh));
		} else {
			r[r.t - 1] |= x << sh;
		}
		sh += 8;
		if (sh >= r.DB) {
			sh -= r.DB;
		}
	}
	r.clamp();
	return r;
}

/**
 * @param {boolean} neg
 * @param {!BigInteger} v
 * @return {!BigInteger}
 */
function getBI(neg, v) {
	if (neg) {
		BigInteger.ZERO.subTo(v, v);
	}
	return v;
}

/**
 * @param {!PartialParser} p
 * @param {boolean} neg
 * @return {!BigInteger}
 */
function bigIntFromBytes(p, neg) {
	//var b = p.mBytes.subarray(0, p.mBytesLen);
	return getBI(neg, bigintFromBytes2(/** @type {!Uint8Array} */ (p.mBytes), p.mBytesLen, new BigInteger(null)));
}

/**
 * @param {number} n
 * @return {!BigInteger}
 */
function bigIntFromNumber(n) {
	if (n < 0) {
		return getBI(true, bigIntFromNumber(0 - n));
	}
	if (n == 0) {
		return BigInteger.ZERO.clone();
	}
	if (!isSafeInteger(n)) {
		throw "arg is not safe integer";
	}

	//return new BigInteger(n.toString(16), 16);

	var val = new BigInteger(null);
	val.s = 0;
	val.t = 1;
	val[0] = n & val.DM;
	n = Math.floor(n/val.DV);
	for (var i = 1; n > 0; ++i) {
		val[i] = n & val.DM;
		++val.t;
		n = Math.floor(n/val.DV);
	}
	return val;
}

/**
 * @param {!PartialParser} p
 * @param {number} bval
 */
function varintNextByte(p, bval) {
	if (p.mVarintBitshift < 28) {
		p.mVarintVal |= (bval & 0x7F) << p.mVarintBitshift;
		p.mVarintMul <<= 7;
	} else if (p.mVarintBitshift < 49) {
		// can read 7 bytes before having to switch to BigInteger
		// must use addition/multiplication (cannot use bit ops on big numbers)
		// see https://stackoverflow.com/questions/307179/what-is-javascripts-highest-integer-value-that-a-number-can-go-to-without-losin
		p.mVarintVal += (bval & 0x7F) * p.mVarintMul;
		p.mVarintMul *= 128;
	} else if (p.mVarintBitshift > 56) {
		throw "varint too big";
	} else {
		if (p.mVarintBitshift == 49) {
			// mVarintVal is a number; must convert to a BigInteger
			p.mVarintVal = bigIntFromNumber(/** @type {number} */ (p.mVarintVal));
		}
		TMPBI1.fromInt(bval & 0x7F);
		TMPBI1.lShiftTo(p.mVarintBitshift, TMPBI1);
		p.mVarintVal.addTo(TMPBI1, /** @type {!BigInteger} */ (p.mVarintVal));
	}
	p.mVarintBitshift += 7;
}

/**
 * @param {!PartialParser} p
 * @param {!Uint8Array} b
 * @return {!string}
 */
function getstr(p, b) {
	var str = PartialParser.BUF2STR ? PartialParser.BUF2STR.get(b) : null;
	return str ? str : STRDEC(b);
}

/**
 * @param {!PartialParser} p
 */
function clearBytes(p) {
	if (p.mBytes.length > 4096) {
		p.mBytes = null;
	}
}

/**
 * @param {!PartialParser.Buff} b
 * @return {Array}
 * @memberof PartialParser
 */
PartialParser.prototype.parseNext = function(b) {
	var p = this;
	var buff = b.data;
	var idx = b.idx;
	var stop = b.idx + b.len;
	MainLoop:
	while (true) {
		switch (p.mState) {
			case S_NEXTOBJ:
				if (idx >= stop) {
					b.idx = idx;
					b.len = 0;
					return null;
				}
				switch (buff[idx++]) {
					case OpaDef.UNDEFINED:  hitNext(p, undefined); continue;
					case OpaDef.NULL:       hitNext(p, null);      continue;
					case OpaDef.FALSE:      hitNext(p, false);     continue;
					case OpaDef.TRUE:       hitNext(p, true);      continue;
					case OpaDef.ZERO:       hitNext(p, 0);         continue;
					case OpaDef.EMPTYBIN:   hitNext(p, NEWBUF(0)); continue;
					case OpaDef.EMPTYSTR:   hitNext(p, "");        continue;
					case OpaDef.EMPTYARRAY: hitNext(p, []);        continue;
					case OpaDef.SORTMAX:    hitNext(p, OpaDef.SORTMAX_OBJ); continue;

					case OpaDef.NEGVARINT: initVarint(p, OpaDef.NEGVARINT, S_VARINT2); continue;
					case OpaDef.POSVARINT: initVarint(p, OpaDef.POSVARINT, S_VARINT2); continue;

					case OpaDef.NEGBIGINT: initBytes(p, OpaDef.NEGBIGINT, S_BIGINT); continue;
					case OpaDef.POSBIGINT: initBytes(p, OpaDef.POSBIGINT, S_BIGINT); continue;

					case OpaDef.POSPOSVARDEC: initVarint(p, OpaDef.POSPOSVARDEC, S_VARDEC1); continue;
					case OpaDef.POSNEGVARDEC: initVarint(p, OpaDef.POSNEGVARDEC, S_VARDEC1); continue;
					case OpaDef.NEGPOSVARDEC: initVarint(p, OpaDef.NEGPOSVARDEC, S_VARDEC1); continue;
					case OpaDef.NEGNEGVARDEC: initVarint(p, OpaDef.NEGNEGVARDEC, S_VARDEC1); continue;

					case OpaDef.POSPOSBIGDEC: initVarint(p, OpaDef.POSPOSBIGDEC, S_BIGDEC1); continue;
					case OpaDef.POSNEGBIGDEC: initVarint(p, OpaDef.POSNEGBIGDEC, S_BIGDEC1); continue;
					case OpaDef.NEGPOSBIGDEC: initVarint(p, OpaDef.NEGPOSBIGDEC, S_BIGDEC1); continue;
					case OpaDef.NEGNEGBIGDEC: initVarint(p, OpaDef.NEGNEGBIGDEC, S_BIGDEC1); continue;

					case OpaDef.BINLPVI: initBytes(p, OpaDef.BINLPVI, S_BLOB); continue;
					case OpaDef.STRLPVI: initBytes(p, OpaDef.STRLPVI, S_STR ); continue;

					case OpaDef.ARRAYSTART:
						if (p.mCurrCont != null) {
							p.mContainers.push(p.mCurrCont);
						}
						p.mCurrCont = [];
						continue;
					case OpaDef.ARRAYEND:
						if (p.mCurrCont == null) {
							throwErr(p, "array end token when not in array");
						}
						if (p.mContainers.length == 0) {
							var tmp = p.mCurrCont;
							p.mCurrCont = null;
							b.idx = idx;
							b.len = stop - idx;
							return tmp;
						}
						var parent = /** @type {!Array} */ (p.mContainers.pop());
						parent.push(p.mCurrCont);
						p.mCurrCont = parent;
						continue;
					default:
						throwErr(p, "unknown char");
				}

			case S_VARINT1:
				while (true) {
					if (idx >= stop) {
						b.idx = idx;
						b.len = 0;
						return null;
					}
					var bval = buff[idx++];
					varintNextByte(p, bval);
					if ((bval & 0x80) == 0) {
						p.mState = p.mNextState;
						continue MainLoop;
					}
				}
			case S_VARINT2:
				hitNext(p, getNum(p.mObjType == OpaDef.NEGVARINT, p.mVarintVal));
				p.mState = S_NEXTOBJ;
				continue;
			case S_BYTES1:
				p.mBytesLen = getVarint32(p, false);
				if (p.mBytes == null || p.mBytes.length < p.mBytesLen) {
					p.mBytes = NEWBUF(p.mBytesLen);
				}
				p.mBytesIdx = 0;
				p.mState = S_BYTES2;
				// fall-thru to next state
			case S_BYTES2:
				var numToCopy = Math.min(stop - idx, p.mBytesLen - p.mBytesIdx);
				p.mBytes.set(buff.subarray(idx, idx + numToCopy), p.mBytesIdx);
				p.mBytesIdx += numToCopy;
				idx += numToCopy;
				if (p.mBytesIdx < p.mBytesLen) {
					b.idx = idx;
					b.len = 0;
					return null;
				}
				p.mState = p.mNextState2;
				continue;
			case S_BIGINT:
				hitNext(p, bigIntFromBytes(p, p.mObjType == OpaDef.NEGBIGINT));
				//p.mBytes = null;
				clearBytes(p);
				p.mState = S_NEXTOBJ;
				continue;

			case S_VARDEC1:
				p.mDecExp = getVarint32(p, p.mObjType == OpaDef.NEGPOSVARDEC || p.mObjType == OpaDef.NEGNEGVARDEC);
				initVarint(p, p.mObjType, S_VARDEC2);
				continue;
			case S_VARDEC2:
				var m = getNum(p.mObjType == OpaDef.POSNEGVARDEC || p.mObjType == OpaDef.NEGNEGVARDEC, p.mVarintVal);
				m = (typeof m == "number") ? bigIntFromNumber(m) : m;
				hitNext(p, new BigDec(m, p.mDecExp));
				p.mState = S_NEXTOBJ;
				continue;

			case S_BIGDEC1:
				p.mDecExp = getVarint32(p, p.mObjType == OpaDef.NEGPOSBIGDEC || p.mObjType == OpaDef.NEGNEGBIGDEC);
				initBytes(p, p.mObjType, S_BIGDEC2);
				continue;
			case S_BIGDEC2:
				var m = bigIntFromBytes(p, p.mObjType == OpaDef.POSNEGBIGDEC || p.mObjType == OpaDef.NEGNEGBIGDEC);
				hitNext(p, new BigDec(m, p.mDecExp));
				//p.mBytes = null;
				clearBytes(p);
				p.mState = S_NEXTOBJ;
				continue;

			case S_BLOB:
				// TODO: if p.mBytes.length is large then the subarray will be larger than needed
				//   create smaller array and copy data to smaller array??
				//   create simple array if len is short (not buffer/uint8array)? what is the cutoff length?
				hitNext(p, p.mBytes.subarray(0, p.mBytesLen));
				// cannot reuse buffer! since it is returned to caller
				p.mBytes = null;
				p.mState = S_NEXTOBJ;
				continue;
			case S_STR:
				hitNext(p, getstr(p, p.mBytes.subarray(0, p.mBytesLen)));
				//p.mBytes = null;
				clearBytes(p);
				p.mState = S_NEXTOBJ;
				continue;

			default:
				throwErr(p, "unknown state");
		}
	}
}

/**
 * maps {utf-8 bytes -> strings} to avoid conversion (speed up) and improve
 * memory usage (prevent duplicate copies of same string)
 * @type {Map<!Uint8Array, !string>}
 * @const
 * @memberof PartialParser
 */
PartialParser.BUF2STR = (typeof Map == "undefined") ? null : new Map();

}());

/**
 * @constructor
 * @memberof PartialParser
 */
PartialParser.Buff = function() {
	/** @type {Uint8Array} */
	this.data = null;
	/** @type {number} */
	this.idx = 0;
	/** @type {number} */
	this.len = 0;
};

// Dependencies: BigInteger, BigDec, OpaDef, NEWBUF, STRENC

/**
 * @interface
 */
var IWriter = function() {};

/**
 * @param {!Uint8Array} buff
 */
IWriter.prototype.write = function(buff) {};

IWriter.prototype.flush = function() {};


/**
 * @constructor
 * @param {!IWriter} out - Where to write values
 * @param {number=} sz - Length of internal buffer
 */
function Serializer(out, sz) {
	if (sz && sz <= 10) {
		throw "buffer len is too small";
	}
	/** @type {!IWriter} */
	this.o = out;
	/** @type {!Uint8Array} */
	this.b = NEWBUF(sz ? sz : 4096);
	/** @type {number} */
	this.i = 0;
}

(function(){

var SURROGATE_OFFSET = 0x010000 - (0xD800 << 10) - 0xDC00;
var BIMAXVARINT = new BigInteger("9223372036854775807");
var BIMINVARINT = BIMAXVARINT.negate();
var BIGINT31 = new BigInteger("7FFFFFFF", 16);

// note: potential memory leak here. keeping a temp big int object for serialization, to prevent allocations
//  it does not get cleared after use. assume memory usage will not be very large for 1 value
var TMPBI2 = new BigInteger(null);

/**
 * @param {!string} s
 * @param {number} offset
 * @param {number} len
 * @return {number}
 */
function getUtf8Len(s, offset, len) {
	var end = offset + len;
	var numBytes = len;
	for (var i = offset; i < end; ++i) {
		var ch = s.charCodeAt(i);
		if (ch < 0x80) {
		} else if (ch < 0x800) {
			++numBytes;
		} else if (ch < 0xD800 || ch > 0xDFFF) {
			numBytes += 2;
		} else {
			// surrogate pair
			// confirm valid high surrogate
			if (ch < 0xDC00 && (i < end - 1)) {
				var ch2 = s.charCodeAt(i + 1);
				// confirm valid low surrogate
				if (ch2 >= 0xDC00 && ch2 <= 0xDFFF) {
					numBytes += 3;
					++i;
					continue;
				}
			}
			// invalid surrogate pair; will use 3 byte replacement when writing utf-8 bytes
			numBytes += 2;
		}
	}
	return numBytes;
}

/**
 * @param {!Serializer} ser
 * @param {!string} str
 */
function writeUtf8(ser, str) {
	var end = str.length;
	//var blen = buff.length;
	var bpos = ser.i;
	var buff = ser.b;
	for (var i = 0; i < end; ++i) {
		if (bpos + 4 > buff.length) {
			flushBuff(ser);
			bpos = 0;
			buff = ser.b;
		}
		var ch = str.charCodeAt(i);
		if (ch < 0x80) {
			buff[bpos++] = ch;
		} else if (ch < 0x800) {
			buff[bpos++] = 0xC0 | (ch >> 6);
			buff[bpos++] = 0x80 | (ch & 0x3F);
		} else if (ch < 0xD800 || ch > 0xDFFF) {
			buff[bpos++] = 0xE0 | (ch >> 12);
			buff[bpos++] = 0x80 | ((ch >> 6) & 0x3F);
			buff[bpos++] = 0x80 | (ch & 0x3F);
		} else {
			// surrogate pair
			// confirm valid high surrogate
			if (ch < 0xDC00 && (i < end - 1)) {
				var ch2 = str.charCodeAt(i + 1);
				// confirm valid low surrogate and write pair
				if (ch2 >= 0xDC00 && ch2 <= 0xDFFF) {
					ch2 = (ch << 10) + ch2 + SURROGATE_OFFSET;
					++i;
					buff[bpos++] = 0xF0 | (ch2 >> 18);
					buff[bpos++] = 0x80 | ((ch2 >> 12) & 0x3F);
					buff[bpos++] = 0x80 | ((ch2 >> 6) & 0x3F);
					buff[bpos++] = 0x80 | (ch2 & 0x3F);
					continue;
				}
			}
			// replace unpaired surrogate or out-of-order low surrogate with substitution character
			buff[bpos++] = 0xEF;
			buff[bpos++] = 0xBF;
			buff[bpos++] = 0xBD;
		}
	}
	//return bpos;
	ser.i = bpos;
}

/**
 * @param {!Serializer} s
 */
function flushBuff(s) {
	if (s.i > 0) {
		s.o.write(s.i == s.b.length ? s.b : s.b.subarray(0, s.i));
		s.i = 0;
	}
}

/**
 * @param {!Serializer} s
 * @param {number} l
 */
function ensureSpace(s, l) {
	if (s.i + l > s.b.length) {
		flushBuff(s);
	}
}

/**
 * @param {!Serializer} s
 * @param {number} t
 * @param {number} v
 */
function writeTypeAndVarint(s, t, v) {
	ensureSpace(s, 10);
	if (t != 0) {
		s.b[s.i++] = t;
	}
	while (v > 0x7FFFFFFF) {
		// numbers greater than 31 bits need to use math ops. cannot use bit ops
		s.b[s.i++] = 0x80 | (v % 128);
		v = Math.floor(v/128);
	}
	while (v > 0x7F) {
		s.b[s.i++] = 0x80 | (v & 0xFF);
		v >>>= 7;
	}
	s.b[s.i++] = v;
}

/**
 * @param {!Serializer} s
 * @param {number} t
 * @param {!BigInteger} v
 */
function writeTypeAndBigBytes(s, t, v) {
	if (v.signum() < 0) {
		BigInteger.ZERO.subTo(v, TMPBI2);
		writeTypeAndBigBytes(s, t, TMPBI2);
		return;
	}
	var bitLen = v.bitLength();
	var numBytes = (bitLen >> 3) + ((bitLen & 0x7) == 0 ? 0 : 1);
	// TODO: implement a function that doesn't require memory allocation
	var buff = v.toByteArray();
	if (!(buff.length == numBytes || buff.length == numBytes + 1)) {
		throw "BigInteger.toByteArray() returned unexpected value";
	}
	writeTypeAndVarint(s, t, numBytes);
	for (var i = buff.length - numBytes; i < buff.length; ++i) {
		s.write1(buff[i]);
	}
}

/**
 * @param {!Serializer} s
 * @param {number} t
 * @param {!BigInteger} v
 */
function writeBIAsVI(s, t, v) {
	if (v.signum() < 0) {
		BigInteger.ZERO.subTo(v, TMPBI2);
		writeBIAsVI(s, t, TMPBI2);
		return;
	}

	ensureSpace(s, 10);
	if (t != 0) {
		s.b[s.i++] = t;
	}

	if (v.compareTo(BIGINT31) > 0) {
		if (v != TMPBI2) {
			v.copyTo(TMPBI2);
			v = TMPBI2;
		}
		while (v.compareTo(BIGINT31) > 0) {
			s.b[s.i++] = 0x80 | (v.byteValue() & 0x7F);
			v.rShiftTo(7, v);
		}
	}

	var intv = v.intValue();
	while (intv > 0x7F) {
		s.b[s.i++] = 0x80 | (intv & 0xFF);
		intv >>>= 7;
	}
	s.b[s.i++] = intv;
}

/**
 * @param {!Serializer} s
 * @param {!BigInteger} v
 */
function writeBigInt(s, v) {
	var sn = v.signum();
	if (sn == 0) {
		s.write1(OpaDef.ZERO);
	} else if (sn > 0) {
		if (v.compareTo(BIMAXVARINT) <= 0) {
			writeBIAsVI(s, OpaDef.POSVARINT, v);
		} else {
			writeTypeAndBigBytes(s, OpaDef.POSBIGINT, v);
		}
	} else {
		if (v.compareTo(BIMINVARINT) >= 0) {
			writeBIAsVI(s, OpaDef.NEGVARINT, v);
		} else {
			writeTypeAndBigBytes(s, OpaDef.NEGBIGINT, v);
		}
	}
}

/**
 * @param {!Serializer} s
 * @param {!BigDec} v
 */
function writeBigDec(s, v) {
	if (v.e == 0) {
		writeBigInt(s, v.m);
	} else {
		var negExp = v.e < 0 ? true : false;
		var scale = v.e < 0 ? 0 - v.e : v.e;
		if (v.signum() > 0) {
			if (v.m.compareTo(BIMAXVARINT) <= 0) {
				writeTypeAndVarint(s, negExp ? OpaDef.NEGPOSVARDEC : OpaDef.POSPOSVARDEC, scale);
				writeBIAsVI(s, 0, v.m);
			} else {
				writeTypeAndVarint(s, negExp ? OpaDef.NEGPOSBIGDEC : OpaDef.POSPOSBIGDEC, scale);
				writeTypeAndBigBytes(s, 0, v.m);
			}
		} else {
			if (v.m.compareTo(BIMINVARINT) >= 0) {
				writeTypeAndVarint(s, negExp ? OpaDef.NEGNEGVARDEC : OpaDef.POSNEGVARDEC, scale);
				writeBIAsVI(s, 0, v.m);
			} else {
				writeTypeAndVarint(s, negExp ? OpaDef.NEGNEGBIGDEC : OpaDef.POSNEGBIGDEC, scale);
				writeTypeAndBigBytes(s, 0, v.m);
			}
		}
	}
}

/**
 * Write a single byte
 * @param {!number} v
 */
Serializer.prototype.write1 = function(v) {
	if (this.i >= this.b.length) {
		flushBuff(this);
	}
	this.b[this.i++] = v;
}

/**
 * Write a raw byte array
 * @param {!Uint8Array} b
 */
Serializer.prototype.write = function(b) {
	if (b.length > this.b.length - this.i) {
		flushBuff(this);
		if (b.length >= this.b.length) {
			this.o.write(b);
			return;
		}
	}
	this.b.set(b, this.i);
	this.i += b.length;
}

/**
 * Force any buffered bytes to be written
 */
Serializer.prototype.flush = function() {
	flushBuff(this);
	if (typeof this.o.flush === "function") {
		this.o.flush();
	}
}

/**
 * Serialize a number
 * @param {!number} v
 */
Serializer.prototype.writeNumber = function(v) {
	if (isSafeInteger(v)) {
		if (v > 0) {
			writeTypeAndVarint(this, OpaDef.POSVARINT, v);
		} else if (v == 0) {
			this.write1(OpaDef.ZERO);
		} else {
			writeTypeAndVarint(this, OpaDef.NEGVARINT, 0 - v);
		}
	} else {
		if (typeof v != "number") {
			throw "not a number";
		}
		if (isNaN(v) || !isFinite(v)) {
			throw "number is NaN or Infinity or -Infinity; cannot be serialized";
		}
		writeBigDec(this, new BigDec(v.toString()));
	}
}

/**
 * Serialize a string
 * @param {!string} v
 */
Serializer.prototype.writeString = function(v) {
	if (v.length == 0) {
		this.write1(OpaDef.EMPTYSTR);
		return;
	}
	var b;
	if (Serializer.STR2BUF) {
		b = Serializer.STR2BUF.get(v);
		if (b) {
			writeTypeAndVarint(this, OpaDef.STRLPVI, b.length);
			this.write(b);
			return;
		}
	}
	if (v.length < 1024) {
		// TODO: what is the proper cutoff string length to use the built-in encoder vs iterating over each char?
		writeTypeAndVarint(this, OpaDef.STRLPVI, getUtf8Len(v, 0, v.length));
		writeUtf8(this, v);
	} else {
		b = STRENC(v);
		writeTypeAndVarint(this, OpaDef.STRLPVI, b.length);
		this.write(b);
	}
}

/**
 * Serialize an Array
 * @param {!Array} v
 */
Serializer.prototype.writeArray = function(v) {
	if (v.length == 0) {
		this.write1(OpaDef.EMPTYARRAY);
	} else {
		this.write1(OpaDef.ARRAYSTART);
		for (var i = 0; i < v.length; ++i) {
			this.writeObject(v[i]);
		}
		this.write1(OpaDef.ARRAYEND);
	}
}

/**
 * Serialize any supported value (undefined/null/boolean/number/string/Uint8Array/BigInteger/BigDec/OpaDef.SORTMAX_OBJ)
 * or an Object with toOpaSO() property, or an Array containing any of the previously listed types.
 * @param {*} v
 */
Serializer.prototype.writeObject = function(v) {
	// TODO: handle iterable objects?
	//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
	switch (typeof v) {
		case "string":
			this.writeString(v);
			break;
		case "number":
			this.writeNumber(v);
			break;
		case "bigint":
			// note: this is here to attempt initial support for native bigint. It has not been tested.
			// TODO: test this! Chrome v67 and later should support bigints. Eventually more browsers will add support
			// TODO: this will be slow. add code to avoid conversion
			writeBigInt(this, new BigInteger(v.toString()));
			break;
		case "boolean":
			this.write1(v ? OpaDef.TRUE : OpaDef.FALSE);
			break;
		case "undefined":
			this.write1(OpaDef.UNDEFINED);
			break;
		case "object":
			v = /** @type {Object} */ (v);
			if (v === null) {
				this.write1(OpaDef.NULL);
			} else if (v.hasOwnProperty("toOpaSO") && typeof v.toOpaSO == "function") {
				v.toOpaSO(this);
			} else if (Array.isArray(v)) {
				this.writeArray(v);
			} else if (v === OpaDef.SORTMAX_OBJ) {
				this.write1(OpaDef.SORTMAX);
			} else if (v instanceof BigInteger) {
				writeBigInt(this, v);
			} else if (v instanceof BigDec) {
				writeBigDec(this, v);
			} else if (v.constructor.name == "Uint8Array" || v.constructor.name == "Buffer") {
				v = /** @type {!Uint8Array} */ (v);
				if (v.length == 0) {
					this.write1(OpaDef.EMPTYBIN);
				} else {
					writeTypeAndVarint(this, OpaDef.BINLPVI, v.length);
					this.write(v);
				}
			} else {
				throw "unsupported object type " + v.constructor.name;
			}
			break;
		default:
			throw "unsupported type " + typeof v;
	}
}

/**
 * maps {strings -> utf-8 bytes} to avoid conversion (speed up)
 * @type {Map<!string, !Uint8Array>}
 * @const
 * @memberof Serializer
 */
Serializer.STR2BUF = (typeof Map == "undefined") ? null : new Map();

}());


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
 * @type {function(number):boolean}
 */
var isInteger = Number.isInteger || function(v) {
	return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
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

// dependencies: STRENC PartialParser Serializer Queue Map

/**
 * @ignore
 * @typedef {function(*, *=):undefined}
 */
var ResponseCallback;

/**
 * @callback ResponseCallback
 * @param {*} result - The result of the operation. Can be null.
 * @param {*=} error - If response is an error then result is null and error is non-null
 */


/**
 * Create new EventClient
 * @constructor
 * @param {!IWriter} o - Object that has a write() and flush() method.
 */
function EventClient(o) {
	/** @type {!Serializer} */
	this.s = new Serializer(o);
	/** @type {number} */
	this.id = 0;
	/** @type {Queue<ResponseCallback>} */
	this.mMainCallbacks = new Queue();
	/** @type {!Map<*,!ResponseCallback>} */
	this.mAsyncCallbacks = new Map();
	/** @type {!PartialParser} */
	this.mParser = new PartialParser();
	/** @type {PartialParser.Buff} */
	this.mBuff = new PartialParser.Buff();
	/** @type {number|null} */
	this.mTimeout = null;
}

(function(){

/**
 * @param {EventClient} c
 */
function schedTimeout(c) {
	if (c.mTimeout === null) {
		// TODO: use process.nextTick() in node?
		c.mTimeout = setTimeout(function() {
			c.mTimeout = null;
			c.s.flush();
		}, 0);
	}
}

/**
 * @param {EventClient} c
 * @param {string} cmd
 */
function writeCommand(c, cmd) {
	// note: command cache was removed. STR2BUF (in Serializer) can be used instead
	c.s.writeString(cmd);
}

/**
 * @param {EventClient} c
 * @param {string} cmd
 * @param {Array=} args
 */
function callNoResponse(c, cmd, args) {
	// if no callback is specified then send null as async id indicating server must not send response
	c.s.write1(OpaDef.ARRAYSTART);
	writeCommand(c, cmd);
	c.s.writeObject(args ? args : null);
	c.s.write1(OpaDef.NULL);
	c.s.write1(OpaDef.ARRAYEND);
}

/**
 * Send all buffered requests.
 */
EventClient.prototype.flush = function() {
	if (this.mTimeout != null) {
		clearTimeout(this.mTimeout);
		this.mTimeout = null;
	}
	this.s.flush();
}

/**
 * Sends the specified command and args to the server. Invokes the specified callback when a response is received.
 * @param {string} cmd - The command to run
 * @param {Array=} args - The parameters for the command
 * @param {ResponseCallback=} cb - A callback function to invoke when the response is received
 */
EventClient.prototype.call = function(cmd, args, cb) {
	if (!cb) {
		return callNoResponse(this, cmd, args);
	}
	this.s.write1(OpaDef.ARRAYSTART);
	writeCommand(this, cmd);
	if (args) {
		this.s.writeObject(args);
	}
	this.s.write1(OpaDef.ARRAYEND);
	schedTimeout(this);
	this.mMainCallbacks.push(cb);
}

/**
 * @param {!EventClient} c
 * @param {string} cmd
 * @param {Array} args
 * @param {!ResponseCallback} cb
 * @param {number} isP
 * @return {number}
 */
function callId(c, cmd, args, cb, isP) {
	++c.id;
	var id = isP ? 0 - c.id : c.id;

	c.s.write1(OpaDef.ARRAYSTART);
	writeCommand(c, cmd);
	c.s.writeObject(args);
	c.s.writeNumber(id);
	c.s.write1(OpaDef.ARRAYEND);
	schedTimeout(c);
	c.mAsyncCallbacks.set(id, cb);
	return id;
}

/**
 * Sends the specified command and args to the server with an async id. Using an async id indicates to the
 * server that the operation response can be sent out of order. Invokes the specified callback when a
 * response is received.
 * @param {string} cmd - The command to run
 * @param {!Array} args - The parameters for the command
 * @param {!ResponseCallback} cb - A callback function to invoke when the response is received
 */
EventClient.prototype.callA = function(cmd, args, cb) {
	callId(this, cmd, args, cb, 0);
}

/**
 * Same as callA() except that the callback can be invoked multiple times. Use this for subscriptions.
 * @param {string} cmd - The command to run
 * @param {!Array} args - The parameters for the command
 * @param {!ResponseCallback} cb - A callback function to invoke when the responses are received
 * @return {*} - The value that is used when calling unregister()
 */
EventClient.prototype.callAP = function(cmd, args, cb) {
	return callId(this, cmd, args, cb, 1);
}

/**
 * Removes the specified async callback from the client. Use this when unsubscribing from a channel.
 * @param {*} id - The value that was returned from callAP()
 */
EventClient.prototype.unregister = function(id) {
	return this.mAsyncCallbacks.delete(id);
}

/**
 * @param {!EventClient} c
 * @param {!Array<*>} msg
 */
function onResponse(c, msg) {
	var cb;
	var id = msg.length >= 3 ? msg[2] : null;
	if (id !== null && id !== undefined) {
		cb = c.mAsyncCallbacks.get(id);
		if (cb != null && (/** @type {number} */(id) > 0)) {
			c.mAsyncCallbacks.delete(id);
		}
	} else {
		cb = c.mMainCallbacks.shift();
	}

	if (cb != null) {
		if (msg.length >= 2) {
			// failure
			cb(msg[0], msg[1]);
		} else {
			// success
			cb(msg[0]);
		}
	}
}

/**
 * Call this method when more data has arrived from server. Buffer will be parsed
 * and callbacks invoked for each complete response received.
 * @param {!Uint8Array} b - Byte buffer containing data to parse
 */
EventClient.prototype.onRecv = function(b) {
	this.mBuff.data = b;
	this.mBuff.idx = 0;
	this.mBuff.len = b.length;
	while (true) {
		var obj = this.mParser.parseNext(this.mBuff);
		if (obj == null) {
			break;
		}
		onResponse(this, obj);
	}
}

/**
 * Call this method when connection is closed. All request callbacks that have not received a response
 * will be notified of failure. Every persistent async callback will also be notified of failure.
 */
EventClient.prototype.onClose = function() {
	var tmp = this.mMainCallbacks;
	while (tmp.size() > 0) {
		var cb = tmp.shift();
		if (cb) {
			cb(null, OpaDef.ERR_CLOSED);
		}
	}

	tmp = this.mAsyncCallbacks;
	tmp.forEach(function(val, key, map) {
		if (val) {
			val(null, OpaDef.ERR_CLOSED);
		}
	});
	tmp.clear();
}

}());


var E = window['Opatomic'] = {};

E['version'] = VERSION;
E['BigInteger'] = BigInteger;
E['BigDec'] = BigDec;
E['OpaDef'] = OpaDef;
E['stringify'] = opaStringify;
E['opaType'] = opaType;
E['Serializer'] = Serializer;
E['EventClient'] = EventClient;
E['PartialParser'] = PartialParser;

})();
