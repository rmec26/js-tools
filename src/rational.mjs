//@ts-check

import { StringCharReader } from "./stringCharReader.mjs";

const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const DECIMAL_SEPERATORS = ['.', ','];
const NEGATIVE_SIGN = '-';
const FRACTION_SEPERATOR = '/';

export class RationalParseError extends Error { }

export class Rational {
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
      return new Rational(false, 0n, 1n);
    } else if (divider === 1n) {
      return new Rational(isNegative, numerator, 1n);
    } else {
      this.isNegative = isNegative;
      let gcd = Rational.gcd(numerator, divider);
      if (gcd === 1n) {
        return new Rational(isNegative, numerator, divider);
      } else {
        return new Rational(isNegative, numerator / gcd, divider / gcd);
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
    return a * b / Rational.gcd(a, b);
  }

  /**
   * @param {number} int 
   * @returns {Rational}
   */
  static fromInt(int) {
    let value = BigInt(int);
    if (value < 0n) {
      return new Rational(true, 0n - value, 1n);
    }
    return new Rational(false, value, 1n);
  }

  /**
   * @param {string} input 
   * @returns {Rational}
   */
  static parse(input) {
    let isNegative = false;
    let reader = new StringCharReader(input);
    let n1 = "";
    let n2 = "";
    let foundSeperator = false;
    let isDecimalSeperator = true;
    if (reader.get() === NEGATIVE_SIGN) {
      isNegative = true;
      reader.getAndNext();
    }
    while (reader.hasNext()) {
      if (foundSeperator) {
        if (reader.currIsOneOf(NUMBERS)) {
          n2 += reader.getAndNext();
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
        } else {
          throw new RationalParseError("Invalid char found");
        }
      }
    }
    if (n1 || n2) {
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
            return Rational.create(isNegative, BigInt(n1 + n2), BigInt('1'.padEnd(n2.length + 1, '0')));
          } else {
            return Rational.create(isNegative, BigInt(n1));
          }
        } else {//Its a fraction
          if (n1) {
            if (n2) {
              return Rational.create(isNegative, BigInt(n1), BigInt(n2));
            }
            throw new RationalParseError(`No divider given`);
          }
          throw new RationalParseError(`No numerator given`);

        }
      } else {
        return Rational.create(isNegative, BigInt(n1));
      }
    } else {
      throw new RationalParseError(`No numbers found on the input`);
    }
  }

  /**
   * @param {Rational} r 
   * @returns {Rational}
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
        d = Rational.lcm(this.divider, r.divider);
        a = d / this.divider * a;
        b = d / r.divider * b;
      }
    }
    if (shouldAdd) {
      return Rational.create(this.isNegative, a + b, d);
    } else {
      if (a > b) {
        return Rational.create(this.isNegative, a - b, d);
      } else {
        return Rational.create(r.isNegative, b - a, d);
      }
    }
  }

  /**
   * @param {Rational} r 
   * @returns {Rational}
   */
  sub(r) {
    return this.add(new Rational(!r.isNegative, r.numerator, r.divider));
  }

  /**
   * @param {Rational} r 
   * @returns {Rational}
   */
  mul(r) {
    return Rational.create(this.isNegative !== r.isNegative, this.numerator * r.numerator, this.divider * r.divider);
  }

  /**
   * @param {Rational} r 
   * @returns {Rational}
   */
  div(r) {
    return Rational.create(this.isNegative !== r.isNegative, this.numerator * r.divider, this.divider * r.numerator);
  }

  /**
   * @returns {Rational}
   */
  trunc() {
    return new Rational(this.isNegative, this.numerator / this.divider, 1n);
  }

  /**
   * @param {Rational} r 
   * @returns {boolean}
   */
  equal(r) {
    return this.isNegative === r.isNegative && this.numerator === r.numerator && this.divider === r.divider
  }

  /**
   * @param {Rational} r 
   * @returns {boolean}
   */
  less(r) {
    if (this.isNegative === r.isNegative) {
      if (this.divider === r.divider) {
        return this.numerator < r.numerator;
      } else {
        let d = Rational.lcm(this.divider, r.divider);
        return (d / this.divider * this.numerator) < (d / r.divider * r.numerator);
      }
    } else {
      return this.isNegative;
    }
  }

  /**
   * @param {Rational} r 
   * @returns {boolean}
   */
  greater(r) {
    if (this.isNegative === r.isNegative) {
      if (this.divider === r.divider) {
        return this.numerator > r.numerator;
      } else {
        let d = Rational.lcm(this.divider, r.divider);
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
   * Note: the value is truncated and not rounded when presented with floating point
   * @param {number} fract
   * @returns {string}
   */
  toString(fract = -1, trimZeros = true) {
    fract = fract | 0;
    if (fract == 0) {
      return `${this.isNegative ? NEGATIVE_SIGN : ""}${this.numerator / this.divider}`
    } else if (fract > 0) {
      let res = (this.numerator * BigInt("1".padEnd(fract + 1, "0")) / this.divider).toString();

      let intPart = res.slice(0, res.length - fract);
      let fractPart = res.slice(res.length - fract);
      if (trimZeros) {
        let i = fractPart.length - 1;
        while (i > 0 && fractPart[i] == '0') {
          i--
        }
        if (i == 0) {
          return `${this.isNegative ? NEGATIVE_SIGN : ""}${intPart}`
        }
        fractPart = fractPart.slice(0, i + 1);
      }

      return `${this.isNegative ? NEGATIVE_SIGN : ""}${intPart}.${fractPart}`;
    } else {
      return `${this.isNegative ? NEGATIVE_SIGN : ""}${this.numerator}${this.divider === 1n ? "" : FRACTION_SEPERATOR + this.divider}`
    }
  }
}
