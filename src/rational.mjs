//@ts-check

import { StringCharReader } from "./stringCharReader.mjs";

const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const DECIMAL_SEPERATORS = ['.', ','];
const NEGATIVE_SIGN = '-';
const POSITIVE_SIGN = '+';
const SIGNS = [NEGATIVE_SIGN, POSITIVE_SIGN];
const FRACTION_SEPERATOR = '/';
const EXPONENT = 'e';

/**
 * @param {bigint} a 
 * @param {bigint} b 
 */
function gcd(a, b) {
  let x;
  while (b != 0n) {
    x = a;
    a = b;
    b = x % b;
  }
  return a
}

/**
 * @param {bigint} a 
 * @param {bigint} b 
 */
function lcm(a, b) {
  return a * b / gcd(a, b);
}


export class RationalParseError extends Error { }

export class RationalNumber {
  /**
   * @param {boolean} isNegative
   * @param {bigint} numerator
   * @param {bigint} divider
   */
  constructor(isNegative, numerator, divider = 1n) {
    if (numerator < 0n) {
      isNegative = !isNegative;
      numerator = 0n - numerator;
    }
    if (divider < 0n) {
      isNegative = !isNegative;
      divider = 0n - divider;
    }


    if (divider === 0n) {
      throw new Error("Divide by Zero");
    } else if (numerator === 0n) {
      isNegative = false;
      divider = 1n;
    } else if (divider === 1n) {
    } else if (divider !== 1n) {
      let commonDivider = gcd(numerator, divider);
      if (commonDivider !== 1n) {
        numerator = numerator / commonDivider;
        divider = divider / commonDivider;
      }
    }

    /** @type {boolean} */
    this.isNegativeNumber = isNegative;
    /** @type {bigint} */
    this.numerator = numerator;
    /** @type {bigint} */
    this.divider = divider;
    Object.freeze(this);
  }

  /**
   * @param {string} input 
   * @returns {RationalNumber}
   */
  static parseString(input) {
    let isNegative = false;
    let reader = new StringCharReader(input.trim());
    let n1 = "";
    let n2 = "";
    let n3 = "";
    let foundSeperator = false;
    let isDecimalSeperator = true;
    let foundExponent = false;
    let isNegativeExponent = false;

    if (reader.currIsOneOf(SIGNS)) {
      isNegative = reader.getAndNext() === NEGATIVE_SIGN;
    }
    while (reader.hasNext()) {
      if (foundExponent) {
        if (reader.currIsOneOf(NUMBERS)) {
          n3 += reader.getAndNext();
        } else {
          throw new RationalParseError("Invalid char found after exponent");
        }
      } else if (foundSeperator) {
        if (reader.currIsOneOf(NUMBERS)) {
          n2 += reader.getAndNext();
        } else if (reader.currIs(EXPONENT)) {
          if (foundSeperator && !isDecimalSeperator) {
            throw new RationalParseError("Exponent after fraction found");
          }
          foundExponent = true;
          reader.getAndNext();
          if (reader.currIsOneOf(SIGNS)) {
            isNegativeExponent = reader.getAndNext() === NEGATIVE_SIGN;
          }
        } else {
          throw new RationalParseError("Invalid char found after seperator");
        }
      } else {
        if (reader.currIsOneOf(NUMBERS)) {
          n1 += reader.getAndNext();
        } else if (reader.currIsOneOf(DECIMAL_SEPERATORS)) {
          foundSeperator = true;
          reader.getAndNext();
        } else if (reader.currIs(FRACTION_SEPERATOR)) {
          foundSeperator = true;
          isDecimalSeperator = false;
          reader.getAndNext();
        } else if (reader.currIs(EXPONENT)) {
          if (foundSeperator && !isDecimalSeperator) {
            throw new RationalParseError("Exponent after fraction found");
          }
          foundExponent = true;
          reader.getAndNext();
          if (reader.currIsOneOf(SIGNS)) {
            isNegativeExponent = reader.getAndNext() === NEGATIVE_SIGN;
          }
        } else {
          throw new RationalParseError("Invalid char found");
        }
      }
    }
    if (foundExponent && !n3) {
      throw new RationalParseError("No value after exponent");
    }
    if (n1 || n2) {
      let value;
      if (foundSeperator) {
        if (isDecimalSeperator) {
          if (!n1) {
            n1 = "0";
          }
          let aux = [...n2];
          //Removes the trailing zeroes
          while (aux.length) {
            if (aux[aux.length - 1] === '0') {
              aux.pop();
            } else {
              break;
            }
          }
          if (aux.length) {
            value = new RationalNumber(isNegative, BigInt(n1 + n2), BigInt('1'.padEnd(n2.length + 1, '0')));
          } else {
            value = new RationalNumber(isNegative, BigInt(n1));
          }
        } else {//Its a fraction
          if (n1) {
            if (n2) {
              value = new RationalNumber(isNegative, BigInt(n1), BigInt(n2));
            } else {
              throw new RationalParseError(`No divider given`);
            }
          } else {
            throw new RationalParseError(`No numerator given`);
          }
        }
      } else {
        value = new RationalNumber(isNegative, BigInt(n1));
      }
      if (n3) {
        if (isNegativeExponent) {
          return value.div(new RationalNumber(false, BigInt('1'.padEnd(parseInt(n3) + 1, '0'))));
        } else {
          return value.mul(new RationalNumber(false, BigInt('1'.padEnd(parseInt(n3) + 1, '0'))));
        }
      }
      return value;
    } else if (n3) {
      throw new RationalParseError(`No numbers before exponent`);
    } else {
      throw new RationalParseError(`No numbers found on the input`);
    }
  }

  /**
   * 
   * @param {string|number|bigint} value 
   */
  static parse(value) {
    if (typeof value === "bigint") {
      return new RationalNumber(false, value, 1n);
    }
    return RationalNumber.parseString(value.toString());
  }

  /**
   * @param {RationalNumber} r 
   * @returns {{n1:bigint,n2:bigint,d:bigint}}
   */
  #normalizeDividers(r) {
    let n1 = this.numerator;
    let n2 = r.numerator;
    let d = this.divider;
    if (this.divider !== r.divider) {
      if (this.divider === 1n) {
        d = r.divider;
        n1 *= d;
      } else if (r.divider === 1n) {
        n2 *= d;
      } else {
        d = lcm(this.divider, r.divider);
        n1 = d / this.divider * n1;
        n2 = d / r.divider * n2;
      }
    }
    return { n1, n2, d };
  }

  /**
   * @param {RationalNumber} r 
   * @returns {RationalNumber}
   */
  add(r) {
    let shouldAdd = this.isNegativeNumber === r.isNegativeNumber;
    const { n1, n2, d } = this.#normalizeDividers(r);
    if (shouldAdd) {
      return new RationalNumber(this.isNegativeNumber, n1 + n2, d);
    } else {
      if (n1 > n2) {
        return new RationalNumber(this.isNegativeNumber, n1 - n2, d);
      } else {
        return new RationalNumber(r.isNegativeNumber, n2 - n1, d);
      }
    }
  }

  /**
   * @param {RationalNumber} r 
   * @returns {RationalNumber}
   */
  sub(r) {
    return this.add(new RationalNumber(!r.isNegativeNumber, r.numerator, r.divider));
  }

  increment() {
    return this.add(ONE);
  }

  decrement() {
    return this.add(MINUS_ONE);
  }

  /**
   * @param {RationalNumber} r 
   * @returns {RationalNumber}
   */
  mul(r) {
    return new RationalNumber(this.isNegativeNumber !== r.isNegativeNumber, this.numerator * r.numerator, this.divider * r.divider);
  }

  /**
   * @param {RationalNumber} r 
   * @returns {RationalNumber}
   */
  div(r) {
    return new RationalNumber(this.isNegativeNumber !== r.isNegativeNumber, this.numerator * r.divider, this.divider * r.numerator);
  }

  /**
   * @param {RationalNumber} r 
   * @returns {RationalNumber}
   */
  pow(r) {
    if (!r.isInt()) {
      throw new Error("Exponent is not an integer");
    }
    let exp = r;
    let result = ONE;
    if (exp.less(ZERO)) {
      while (!exp.equal(ZERO)) {
        result = result.mul(this);
        exp = exp.increment();
      }
      return ONE.div(result);
    } else {
      while (!exp.equal(ZERO)) {
        result = result.mul(this);
        exp = exp.decrement();
      }
      return result;
    }

  }

  /**
   * @returns {RationalNumber}
   */
  trunc() {
    return new RationalNumber(this.isNegativeNumber, this.numerator / this.divider, 1n);
  }

  /**
   * 
   * @returns {RationalNumber}
   */
  fract() {
    return new RationalNumber(this.isNegativeNumber, this.numerator % this.divider, this.divider);
  }
  /**
   * 
   * @returns {RationalNumber}
   */
  reciprocal() {
    return new RationalNumber(this.isNegativeNumber, this.divider, this.numerator);
  }

  /**
   * @returns {RationalNumber}
   */
  opposite() {
    return new RationalNumber(!this.isNegativeNumber, this.numerator, this.divider);
  }

  /**
   * 
   * @returns {boolean}
   */
  isInt() {
    return this.divider === 1n;
  }

  /**
   * 
   * @returns {boolean}
   */
  isPostitive() {
    return !this.isNegativeNumber;
  }

  /**
   * 
   * @returns {boolean}
   */
  isNegative() {
    return this.isNegativeNumber;
  }

  /**
   * 
   * @returns {boolean}
   */
  isZero() {
    return this.numerator === 0n;
  }

  /**
   * @param {RationalNumber} r 
   * @returns {boolean}
   */
  equal(r) {
    return this.isNegativeNumber === r.isNegativeNumber && this.numerator === r.numerator && this.divider === r.divider
  }

  /**
   * @param {RationalNumber} r 
   * @returns {boolean}
   */
  less(r) {
    if (this.isNegativeNumber === r.isNegativeNumber) {
      const { n1, n2 } = this.#normalizeDividers(r);
      return n1 < n2;
    } else {
      return this.isNegativeNumber;
    }
  }

  /**
   * @param {RationalNumber} r 
   * @returns {boolean}
   */
  greater(r) {
    if (this.isNegativeNumber === r.isNegativeNumber) {
      const { n1, n2 } = this.#normalizeDividers(r);
      return n1 > n2;
    } else {
      return r.isNegativeNumber;
    }
  }

  /**
   * @returns {bigint}
   */
  toBigInt() {
    let res = this.numerator / this.divider;
    return this.isNegativeNumber ? 0n - res : res;
  }

  /**
   * @returns {number}
   */
  toInt() {
    let intPart = this.trunc();
    if (intPart.greater(MAX_JS_INTEGER)) {
      throw new Error("Number greater than Number.MAX_SAFE_INTEGER")
    }
    if (intPart.less(MIN_JS_INTEGER)) {
      throw new Error("Number less than Number.MIN_SAFE_INTEGER")
    }
    let res = Number(intPart.numerator);
    return intPart.isNegativeNumber ? 0 - res : res;
  }


  /**
   * @returns {number}
   */
  toNumber() {
    if (this.greater(MAX_JS_VALUE)) {
      throw new Error("Number greater than Number.MAX_JS_VALUE")
    }
    if (this.less(NEGATIVE_MAX_JS_VALUE)) {
      throw new Error("Number less than -Number.MAX_JS_VALUE")
    }
    // A 64-bit floating point number has at most 17 significant numbers
    return Number(this.toScientificNotation(17));
  }

  /**
   *
   * @param {number} fract
   * @returns {string}
   */
  toString(fract = -1, trimZeros = true) {
    fract = fract | 0;

    if (this.numerator === 0n) {
      if (trimZeros || fract < 1) {
        return "0";
      } else {
        return "0.".padEnd(fract + 2, '0')
      }
    }
    if (fract >= 0) {
      // the +2 is one to cover the initial '1' and another to add an extra value on the fractional part for rounding
      let val = this.numerator * BigInt("1".padEnd(fract + 2, "0")) / this.divider;

      //Gets the extra value on the fractional part
      let mod = val % 10n;
      //Removes it from the final value
      val -= mod;
      //If the extra part is between 5-9 then it rounds up
      if (mod > 4n) {
        val += 10n
      }

      //Pads the start for cases where the resulting value is less than the expected fractional part size
      let res = val.toString().padStart(fract + 1, '0');

      //The -1 are due to the extra value
      let intPart = res.slice(0, res.length - fract - 1) || '0';
      let fractPart = res.slice(res.length - fract - 1, res.length - 1);

      if (trimZeros) {
        let i = fractPart.length - 1;
        while (i >= 0 && fractPart[i] == '0') {
          i--
        }
        fractPart = fractPart.slice(0, i + 1);
      }
      return `${this.isNegativeNumber ? NEGATIVE_SIGN : ""}${intPart}${fractPart.length ? `.${fractPart}` : ""}`;
    } else {
      return `${this.isNegativeNumber ? NEGATIVE_SIGN : ""}${this.numerator}${this.divider === 1n ? "" : FRACTION_SEPERATOR + this.divider}`
    }
  }

  toScientificNotation(fract = 5, trimZeros = false) {
    let numerator = this.numerator;
    let divider = this.divider;
    let exponent = 0;
    if (this.numerator !== 0n) {
      let numeratorStr = this.numerator.toString();
      let dividerStr = this.divider.toString();
      exponent = numeratorStr.length - dividerStr.length

      if (exponent > 0) {
        divider = BigInt(dividerStr.padEnd(dividerStr.length + exponent, "0"))
      } else if (exponent < 0) {
        numerator = BigInt(numeratorStr.padEnd(numeratorStr.length - exponent, "0"))
      }
      if (numerator < divider) {
        numerator *= 10n;
        exponent--;
      }
    }
    return `${new RationalNumber(this.isNegativeNumber, numerator, divider).toString(fract, trimZeros)}e${exponent}`
  }
}

export const ZERO = new RationalNumber(false, 0n, 1n);
export const ONE = new RationalNumber(false, 1n, 1n);
export const TEN = new RationalNumber(false, 10n, 1n);
export const MINUS_ONE = new RationalNumber(true, 1n, 1n);
export const MAX_JS_INTEGER = RationalNumber.parse(Number.MAX_SAFE_INTEGER);
export const MIN_JS_INTEGER = RationalNumber.parse(Number.MIN_SAFE_INTEGER);
export const MAX_JS_VALUE = RationalNumber.parse(Number.MAX_VALUE);
export const MIN_JS_VALUE = RationalNumber.parse(Number.MIN_VALUE);
export const NEGATIVE_MAX_JS_VALUE = MAX_JS_VALUE.opposite();
export const NEGATIVE_MIN_JS_VALUE = MIN_JS_VALUE.opposite();

export const Rational = RationalNumber.parse;
export const Q = RationalNumber.parse;
