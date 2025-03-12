//@ts-check
const BYTE_MASK = 255;

export class GenericEncoder {
  /**
   * 
   * @param {string} charSet 
   * @param {string} padding 
   */
  constructor(charSet, padding = "") {
    if (charSet.length > 128) {
      throw "charset must not exceed 128 chars"
    }
    this.bits = Math.log2(charSet.length);
    if ((this.bits | 0) != this.bits) {
      throw "charset must have a size of a power of 2"
    }
    this.padding = padding.charAt(0);
    this.lookup = []
    for (let i = 0; i < charSet.length; i++) {
      this.lookup[i] = charSet.charAt(i)
    }
    this.mask = charSet.length - 1;
  }
  /**
   * 
   * @param {string|Buffer} input 
   * @returns 
   */
  encode(input) {
    if (!(input instanceof Buffer)) {
      input = Buffer.from(input)
    }
    let remainer = 0;
    let remainerBits = 0
    let pos = 0;
    let result = ""
    while (pos < input.length) {
      remainer <<= 8
      remainer += input[pos];
      remainerBits += 8;
      while (remainerBits >= this.bits) {
        let bitdiff = remainerBits - this.bits
        let newMask = this.mask << bitdiff;
        let value = (remainer & newMask) >> bitdiff;
        result += this.lookup[value];
        remainer = remainer & ~newMask;
        remainerBits -= this.bits;
      }
      pos++;
    }

    if (remainerBits > 0) {
      remainer <<= 8
      remainerBits += 8;
      let bitdiff = remainerBits - this.bits
      let newMask = this.mask << bitdiff;
      let value = (remainer & newMask) >> bitdiff;
      result += this.lookup[value];
      remainer = remainer & ~newMask;
      remainerBits -= this.bits;

      while (remainerBits > 0) {
        result += this.padding;
        remainerBits -= this.bits;
        if (remainerBits < 0) {
          remainerBits += 8;

        }
      }

    }
    return result
  }
  /**
   * 
   * @param {string} input 
   * @returns 
   */
  decode(input) {
    let result = Buffer.alloc(input.length * this.bits / 8);
    let buffer = 0;
    let bitSize = 0;
    let resultPos = 0;
    for (let i = 0; i < input.length; i++) {
      let c = input[i];
      let charValue = this.lookup.indexOf(c);
      if (charValue == -1) {
        continue;
      }
      buffer <<= this.bits;
      buffer += charValue;
      bitSize += this.bits;
      if (bitSize >= 8) {
        let bitdiff = bitSize - 8
        let newMask = BYTE_MASK << bitdiff;
        let value = (buffer & newMask) >> bitdiff;
        buffer = buffer & ~newMask;
        bitSize -= 8;
        result.writeUInt8(value, resultPos)
        resultPos++
      }
    }
    return result.subarray(0, resultPos)
  }
}

export const hexEncoder = new GenericEncoder("0123456789abcdef");
export const base64Encoder = new GenericEncoder("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", "=");
