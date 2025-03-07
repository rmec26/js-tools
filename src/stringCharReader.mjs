//@ts-check

export class StringCharReader {
  /**
   * @param {string} str 
   */
  constructor(str) {
    /** @type {string} */
    this.str = str;
    /** @type {number} */
    this.pos = 0;
  }
  get() {
    return this.str[this.pos];
  }
  next() {
    this.pos++;
  }
  getAndNext() {
    return this.hasNext() ? this.str[this.pos++] : "";
  }
  /**
   * 
   * @param {string} val 
   * @returns {boolean}
   */
  currIs(val) {
    return val === this.str[this.pos];
  }
  /**
   * 
   * @param {string[]} ops 
   * @returns {boolean}
   */
  currIsOneOf(ops) {
    return ops.includes(this.str[this.pos]);
  }
  hasNext() {
    return this.pos < this.str.length;
  }
}