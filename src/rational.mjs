//@ts-check

import { StringCharReader } from "./stringCharReader.mjs";

const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const DECIMAL_SEPERATORS = ['.', ','];
const NEGATIVE_SIGN = '-';
const POSITIVE_SIGN = '+';
const SIGNS = [NEGATIVE_SIGN, POSITIVE_SIGN];
const FRACTION_SEPERATOR = '/';
const EXPONENT = 'e';

export class RationalParseError extends Error { }

export class RationalNumber {
  /**
   * @param {boolean} isNegative 
   * @param {bigint} numerator 
   * @param {bigint} divider 
   */
  constructor(isNegative, numerator, divider) {
    /** @type {boolean} */
    this.isNegative = isNegative;
    /** @type {bigint} */
    this.numerator = numerator;
    /** @type {bigint} */
    this.divider = divider;
  }

  /**
   * @param {boolean} isNegative 
   * @param {bigint} numerator 
   * @param {bigint} divider 
   */
  static create(isNegative, numerator, divider = 1n) {
    if (divider === 0n) {
      throw new Error("Divide by Zero");
    } else if (numerator === 0n) {
      return new RationalNumber(false, 0n, 1n);
    } else if (divider === 1n) {
      return new RationalNumber(isNegative, numerator, 1n);
    } else {
      this.isNegative = isNegative;
      let gcd = RationalNumber.gcd(numerator, divider);
      if (gcd === 1n) {
        return new RationalNumber(isNegative, numerator, divider);
      } else {
        return new RationalNumber(isNegative, numerator / gcd, divider / gcd);
      }
    }
  }

  /**
   * @param {bigint} a 
   * @param {bigint} b 
   */
  static gcd(a, b) {
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
  static lcm(a, b) {
    return a * b / RationalNumber.gcd(a, b);
  }

  /**
   * @param {number} int 
   * @returns {RationalNumber}
   */
  static fromInt(int) {
    let value = BigInt(int);
    if (value < 0n) {
      return new RationalNumber(true, 0n - value, 1n);
    }
    return new RationalNumber(false, value, 1n);
  }

  /**
   * @param {string} input 
   * @returns {RationalNumber}
   */
  static parse(input) {
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
            value = RationalNumber.create(isNegative, BigInt(n1 + n2), BigInt('1'.padEnd(n2.length + 1, '0')));
          } else {
            value = RationalNumber.create(isNegative, BigInt(n1));
          }
        } else {//Its a fraction
          if (n1) {
            if (n2) {
              value = RationalNumber.create(isNegative, BigInt(n1), BigInt(n2));
            } else {
              throw new RationalParseError(`No divider given`);
            }
          } else {
            throw new RationalParseError(`No numerator given`);
          }
        }
      } else {
        value = RationalNumber.create(isNegative, BigInt(n1));
      }
      if (n3) {
        if (isNegativeExponent) {
          return value.div(RationalNumber.create(false, BigInt('1'.padEnd(parseInt(n3) + 1, '0'))));
        } else {
          return value.mul(RationalNumber.create(false, BigInt('1'.padEnd(parseInt(n3) + 1, '0'))));
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
   * @param {RationalNumber} r 
   * @returns {RationalNumber}
   */
  add(r) {
    let shouldAdd = this.isNegative === r.isNegative;
    let a = this.numerator;
    let b = r.numerator;
    let d = this.divider;
    if (this.divider !== r.divider) {
      if (this.divider === 1n) {
        d = r.divider;
        a *= d;
      } else if (r.divider === 1n) {
        b *= d;
      } else {
        d = RationalNumber.lcm(this.divider, r.divider);
        a = d / this.divider * a;
        b = d / r.divider * b;
      }
    }
    if (shouldAdd) {
      return RationalNumber.create(this.isNegative, a + b, d);
    } else {
      if (a > b) {
        return RationalNumber.create(this.isNegative, a - b, d);
      } else {
        return RationalNumber.create(r.isNegative, b - a, d);
      }
    }
  }

  /**
   * @param {RationalNumber} r 
   * @returns {RationalNumber}
   */
  sub(r) {
    return this.add(new RationalNumber(!r.isNegative, r.numerator, r.divider));
  }

  /**
   * @param {RationalNumber} r 
   * @returns {RationalNumber}
   */
  mul(r) {
    return RationalNumber.create(this.isNegative !== r.isNegative, this.numerator * r.numerator, this.divider * r.divider);
  }

  /**
   * @param {RationalNumber} r 
   * @returns {RationalNumber}
   */
  div(r) {
    return RationalNumber.create(this.isNegative !== r.isNegative, this.numerator * r.divider, this.divider * r.numerator);
  }

  /**
   * @returns {RationalNumber}
   */
  trunc() {
    return new RationalNumber(this.isNegative, this.numerator / this.divider, 1n);
  }

  /**
   * @param {RationalNumber} r 
   * @returns {boolean}
   */
  equal(r) {
    return this.isNegative === r.isNegative && this.numerator === r.numerator && this.divider === r.divider
  }

  /**
   * @param {RationalNumber} r 
   * @returns {boolean}
   */
  less(r) {
    if (this.isNegative === r.isNegative) {
      if (this.divider === r.divider) {
        return this.numerator < r.numerator;
      } else {
        let d = RationalNumber.lcm(this.divider, r.divider);
        return (d / this.divider * this.numerator) < (d / r.divider * r.numerator);
      }
    } else {
      return this.isNegative;
    }
  }

  /**
   * @param {RationalNumber} r 
   * @returns {boolean}
   */
  greater(r) {
    if (this.isNegative === r.isNegative) {
      if (this.divider === r.divider) {
        return this.numerator > r.numerator;
      } else {
        let d = RationalNumber.lcm(this.divider, r.divider);
        return (d / this.divider * this.numerator) > (d / r.divider * r.numerator);
      }
    } else {
      return r.isNegative;
    }
  }

  /**
   * @returns {number}
   */
  toInt() {
    let res = Number(this.numerator / this.divider);
    return this.isNegative ? 0 - res : res;
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

      let res = val.toString();

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

      return `${this.isNegative ? NEGATIVE_SIGN : ""}${intPart}${fractPart.length ? `.${fractPart}` : ""}`;

    } else {
      return `${this.isNegative ? NEGATIVE_SIGN : ""}${this.numerator}${this.divider === 1n ? "" : FRACTION_SEPERATOR + this.divider}`
    }
  }
}

/**
 * 
 * @param {string|number|bigint} value 
 */
export function Rational(value) {
  return RationalNumber.parse(value.toString());
}