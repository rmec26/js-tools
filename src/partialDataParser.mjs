

//@ts-check

/**
 * @typedef {()=>any} KeywordFunction
 * @typedef {{[key:string]:KeywordFunction|any}} KeywordMap
 * @typedef {[string,KeywordFunction|any][]} KeywordList
 * @typedef {{[key:string]:any}} ValueKeywordMap
 * @typedef {{[key:string]:KeywordFunction}} FunctionKeywordMap
 * @typedef {()=>any} StartBlockFn
 * @typedef {(state:any,value:any)=>void} ProcessBlockFn
 * @typedef {(state:any)=>any} EndBlockFn
 * @typedef {{name:string,start:string,end:string,startFn:StartBlockFn,processFn:ProcessBlockFn,endFn:EndBlockFn}} DataBlock
 * @typedef {{startFn:StartBlockFn,processFn:ProcessBlockFn,endFn:EndBlockFn}} BaseBlock
 * @typedef {{start:string,end:string}} CommentBlock
 * @typedef {(str:string)=>any} StringProcessor
 * @typedef {(value:any)=>any} BaseProcessor
 * @typedef {"value"|"start"|"end"} KeywordSeperatorType
 * @typedef {{
 *    syntax?:(Keyword|Seperator)[]
 *    stringLimiters?:string[],
 *    blocks?:DataBlock[],
 *    inlineComments?:string[],
 *    commentBlocks?:CommentBlock[],
 *    keywordProcessor?:StringProcessor,
 *    stringProcessor?:StringProcessor,
 *    baseBlock?:BaseBlock,
 * }} ParserConfig
 * @typedef {{level:any[],block:DataBlock}} StackLevel
 */


class Keyword {
  /**
   * 
   * @param {string} value 
   * @returns {[true,any]|[false]}
   */
  process(value) {
    return [false]
  }
}

class BaseKeyword extends Keyword {
  /**
   * 
   * @param {string} expected 
   * @param {(()=>any)|any} [result]
   */
  constructor(expected, result) {
    super();
    /** @type {string} */
    this.expected = expected;
    /** @type {()=>any} */
    this.result = result instanceof Function ? result : () => result;
  }
  /**
   * 
   * @param {string} value 
   * @returns {[true,any]|[false]}
   */
  process(value) {
    return value === this.expected ? [true, this.result()] : [false];
  }
}

class PrefixKeyword extends Keyword {
  /**
   * 
   * @param {string} expected 
   * @param {((value:string)=>any)|any} [result]
   */
  constructor(expected, result) {
    super();
    /** @type {string} */
    this.expected = expected;
    /** @type {(value:string)=>any} */
    this.result = result instanceof Function ? result : () => result;
  }
  /**
   * 
   * @param {string} value 
   * @returns {[true,any]|[false]}
   */
  process(value) {
    return value.startsWith(this.expected) ? [true, this.result(value.slice(this.expected.length))] : [false];
  }
}

class SuffixKeyword extends Keyword {
  /**
   * 
   * @param {string} expected 
   * @param {((value:string)=>any)|any} [result]
   */
  constructor(expected, result) {
    super();
    /** @type {string} */
    this.expected = expected;
    /** @type {(value:string)=>any} */
    this.result = result instanceof Function ? result : () => result;
  }
  /**
   * 
   * @param {string} value 
   * @returns {[true,any]|[false]}
   */
  process(value) {
    return value.endsWith(this.expected) ? [true, this.result(value.slice(0, -this.expected.length))] : [false];
  }
}

class Seperator {
  /**
   * 
   * @param {string} buffer 
   * @returns {[true,string,any?]|[false]}
   */
  process(buffer) {
    return [false];
  }
}

class SingleSeperator extends Seperator {
  /**
   * 
   * @param {string} expected 
   * @param {(()=>any)|any} [result]
   */
  constructor(expected, result) {
    super();
    /** @type {string} */
    this.expected = expected;
    /** @type {()=>any} */
    this.result = result instanceof Function ? result : () => result;
  }
  /**
   * 
   * @param {string} buffer 
   * @returns {[true,string,any]|[false]}
   */
  process(buffer) {
    return buffer.endsWith(this.expected) ? [true, buffer.slice(0, -this.expected.length), this.result()] : [false];
  }
}

class MultiSeperator extends Seperator {
  /**
   * 
   * @param {string[]} expected 
   */
  constructor(expected) {
    super();
    /** @type {string[]} */
    this.expected = expected;
  }
  /**
   * 
   * @param {string} buffer 
   * @returns {[true,string]|[false]}
   */
  process(buffer) {
    for (const sep of this.expected) {
      if (buffer.endsWith(sep)) {
        return [true, buffer.slice(0, -sep.length)];
      }
    }
    return [false]
  }
}


/**
 * 
 * @param {string} expected 
 * @param {(()=>any)|any} [result]
 */
Keyword.Base = (expected, result) => new BaseKeyword(expected, result);

/**
 * 
 * @param {string} expected 
 * @param {((value:string)=>any)|any} [result]
 */
Keyword.Prefix = (expected, result) => new PrefixKeyword(expected, result);

/**
 * 
 * @param {string} expected 
 * @param {((value:string)=>any)|any} [result]
 */
Keyword.Suffix = (expected, result) => new SuffixKeyword(expected, result);

/**
 * 
 * @param {string} expected 
 * @param {(()=>any)|any} [result]
 */
Seperator.Single = (expected, result) => new SingleSeperator(expected, result);

/**
 * 
 * @param {string[]} expected 
 */
Seperator.Multi = (...expected) => new MultiSeperator(expected);

/**
 * 
 * @param {(keyword:string)=>any} otherProcessor 
 * @returns {(input:string)=>any}
 */
function createNumberOrOtherProcessor(otherProcessor = input => input) {
  return (input) => {
    let num = new Number(input).valueOf();
    if (!Number.isNaN(num)) {
      return num;
    }
    return otherProcessor(input);
  }
}

export class PDParser {
  static MODE_NORMAL = 1;
  static MODE_STRING = 2;
  static MODE_COMMENT_BLOCK = 3;
  static BASE_BLOCK_TYPE = { name: "_Base_", start: "", end: "", startfn: () => [] };
  static ESCAPE_CHAR = "\\";
  static MAX_LIMITER_SIZE = 50;
  /**
   * 
   * @param {ParserConfig} config 
   */
  constructor({
    syntax = [],
    stringLimiters = [],
    blocks = [],
    inlineComments = [],
    commentBlocks = [],
    keywordProcessor = createNumberOrOtherProcessor(),
    stringProcessor = (input) => input,
    baseBlock = { startFn: () => [], processFn: (state, value) => state.push(value), endFn: (state) => state }
  }) {

    //TODO have a clone system that supports functions
    // stringLimiters = structuredClone(stringLimiters);
    // blocks = structuredClone(blocks);
    // inlineComments = structuredClone(inlineComments);
    // commentBlocks = structuredClone(commentBlocks);

    /** @type {number} */
    this.charPos = 1;
    /** @type {number} */
    this.linePos = 1;

    /** @type {any} */
    this.baseLevel = null;
    /** @type {StackLevel[]} */
    this.levels = [];
    /** @type {DataBlock} */
    this.levelBlock = null;
    /** @type {any[]} */
    this.currentLevel = this.baseLevel;
    /** @type {number} */
    this.mode = PDParser.MODE_NORMAL;
    /** @type {string} */
    this.modeEndSequence = "";
    /** @type {string} */
    this.buffer = "";
    /** @type {boolean} */
    this.escapeMode = false;
    /** @type {number} */
    this.bufferAfterEscape = 0;
    /** @type {string} */
    this.currentChar = "";
    /** @type {string[]} */
    this.stringLimiters = stringLimiters;

    /** @type {{type:KeywordSeperatorType,seperator:Seperator}[]} */
    this.seperators2 = [];
    /** @type {{type:KeywordSeperatorType,keyword:Keyword}[]} */
    this.keywords2 = [];

    for (const entry of syntax) {
      if (entry instanceof Seperator) {
        this.seperators2.push({ type: "value", seperator: entry });
      } else if (entry instanceof Keyword) {
        this.keywords2.push({ type: "value", keyword: entry });
      }
    }

    /** @type {DataBlock[]} */
    this.seperatorBlocks = [];
    /** @type {DataBlock[]} */
    this.startEndBlocks = [];
    /** @type {string[]} */
    this.blockEnds = [];
    for (const blk of blocks) {
      if (blk.start === blk.end) {
        this.seperatorBlocks.push(blk);
      } else {
        this.startEndBlocks.push(blk);
        this.blockEnds.push(blk.end);
      }
    }

    /** @type {CommentBlock[]} */
    this.commentBlocks = commentBlocks;
    //Loads the inlime comments as comment blocks that end with '\n'
    for (let inline of inlineComments) {
      this.commentBlocks.push({ start: inline, end: "\n" });
    }

    /** @type {StringProcessor} */
    this.keywordProcessor = keywordProcessor;
    /** @type {StringProcessor} */
    this.stringProcessor = stringProcessor;
    /** @type {BaseBlock} */
    this.baseBlock = baseBlock;
    this._createBaseLevel();
  }
  _createBaseLevel() {
    this._startLevel({ name: "Base", start: "", end: "", ...this.baseBlock }, false);
  }
  _resetBuffer() {
    this.buffer = "";
    this.bufferAfterEscape = 0;
  }
  _processNormalBuffer() {
    if (this.buffer.length) {
      //TODO check if it matches the current end here, if end is a keyword
      for (const { type, keyword } of this.keywords2) {
        const [match, value] = keyword.process(this.buffer);
        if (match) {
          this._resetBuffer();
          switch (type) {
            case "value":
              //Adds possible keyword value
              this._addValueToLevel(value);
              break;
            case "start":
              //TODO Start block here
              break;
            case "end":
              //TODO Throw error because its not the expected end
              break;
          }
          return;
        }
      }

      this._addValueToLevel(this.keywordProcessor(this.buffer));
      this._resetBuffer();
    }
  }

  /**
   * TODO fix doc
   * Checks if the buffer is ending with a valid seperator, if true processes the remaining buffer before it and returns true, returns false if no seperator exists
   * @returns 
   */
  _checkSeperator2() {
    //TODO check if it matches the current end here, if end is a seperator
    for (const { type, seperator } of this.seperators2) {
      const [match, buffer, value] = seperator.process(this.buffer);
      if (match) {
        this.buffer = buffer;
        //Processes the remaining buffer
        this._processNormalBuffer();
        switch (type) {
          case "value":
            //Adds possible seperator value
            this._addValueToLevel(value);
            break;
          case "start":
            //TODO Start block here
            break;
          case "end":
            //TODO Throw error because its not the expected end
            break;
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if the buffer ends with the given value, if true removes said value from the buffer, processes the remaining buffer, resets it and returns true, else it returs false.
   * @param {*} endValue 
   */
  _checkBufferEnd(endValue) {
    if (this.buffer.endsWith(endValue)) {
      //Removes the endValue from the buffer
      this.buffer = this.buffer.slice(0, -endValue.length);
      //Processes the remaining buffer
      this._processNormalBuffer();
      return true;
    }
    return false;
  }
  _startNormal() {
    this._resetBuffer()
    this.mode = PDParser.MODE_NORMAL;
  }
  /**
   * Checks if the buffer is ending with a valid string start, if true processes the remaining buffer before it, sets the parser to string mode and returns true, returns false otherwise.
   * @returns 
   */
  _startString() {
    for (const limiter of this.stringLimiters) {
      if (this._checkBufferEnd(limiter)) {
        //Sets the parser into string mode
        this.mode = PDParser.MODE_STRING;
        this.modeEndSequence = limiter;
        return true;
      }
    }
    return false;
  }
  /**
   * Checks if the buffer is ending with a valid command start, if true processes the remaining buffer before it, sets the parser to comment block mode and returns true, returns false otherwise.
   * @returns 
   */
  _startCommentBlock() {
    for (const { start, end } of this.commentBlocks) {
      if (this._checkBufferEnd(start)) {
        //Sets the parser into comment block mode
        this.mode = PDParser.MODE_COMMENT_BLOCK;
        this.modeEndSequence = end;
        return true;
      }
    }
    return false;
  }
  /**
   * 
   * @param {DataBlock} newBlock 
   * @param {boolean} pushCurrent 
   */
  _startLevel(newBlock, pushCurrent = true) {
    if (pushCurrent) {
      this.levels.push({ level: this.currentLevel, block: this.levelBlock });
    }
    this.currentLevel = newBlock.startFn();
    this.levelBlock = newBlock;
  }
  _addValueToLevel(value) {
    if (value !== undefined) {
      this.levelBlock.processFn(this.currentLevel, value);
    }
  }
  _endLevel() {
    const result = this.levelBlock.endFn(this.currentLevel);
    if (this.levels.length) {
      const level = /** @type {StackLevel} */(this.levels.pop());
      this.currentLevel = level.level;
      this.levelBlock = level.block;
      this._addValueToLevel(result);
    } else {
      return result;
    }
  }
  /**
   * Checks if the buffer is ending with a valid data block start, if true processes the remaining buffer before it, creates the new level and returns true, returns false otherwise.
   * @returns 
   */
  _startStartEndBlock() {
    for (const block of this.startEndBlocks) {
      if (this._checkBufferEnd(block.start)) {
        this._startLevel(block);
        return true;
      }
    }
    return false;
  }
  /**
   * Checks if the buffer is ending with a valid data block end, if true processes the remaining buffer before it, ends the level and returns true, returns false otherwise.
   * @returns 
   */
  _endStartEndBlock() {
    for (const end of this.blockEnds) {
      if (this._checkBufferEnd(end)) {
        if (end === this.levelBlock.end) {
          this._endLevel();
          return true;
        } else {
          throw Error(`Block End '${end}' doesn't match current block ${this.levelBlock.name}`);
        }
      }
    }
    return false;
  }
  /**
   * Checks if the buffer is ending with a valid Seperator block start/end, if true processes the remaining buffer before it, and if the current level block matches the seperator block ends the level else starts the neew level and returns true on bot option, returns false otherwise.
   * @returns 
   */
  _checkSeperatorBlock() {
    for (const block of this.seperatorBlocks) {
      if (this._checkBufferEnd(block.start)) {
        //if the current block is the same as the seperator
        if (this.levelBlock === block) {
          this._endLevel();
        } else {
          this._startLevel(block);
        }
        return true;
      }
    }
    return false;
  }
  /**
   * If in escape mode processes the current char and returns true, if no processing happens it returns false
   * @returns 
   */
  _parseEscapeMode() {
    if (this.escapeMode) {
      this.escapeMode = false;
      this.buffer += this.currentChar;
      this.bufferAfterEscape = this.buffer.length;
      return true;
    } else {
      if (this.currentChar === PDParser.ESCAPE_CHAR) {
        this.escapeMode = true;
        return true;
      }
    }
    return false;
  }
  _parseNormalMode() {
    //checks if its in escape mode
    if (!this._parseEscapeMode()) {
      this.buffer += this.currentChar;
      //check if a seperator exists
      if (!this._checkSeperator2()) {
        //check if a string is starting
        if (!this._startString()) {
          //check if a comment block is starting
          if (!this._startCommentBlock()) {
            //check if a Seperator block is starting or ending
            if (!this._checkSeperatorBlock()) {
              //check if a Start End block is starting
              if (!this._startStartEndBlock()) {
                //check if a Start End block is ending
                this._endStartEndBlock();
              }
            }
          }
        }
      }
    }
  }
  _parseStringMode() {
    if (!this._parseEscapeMode()) {
      this.buffer += this.currentChar;
      if (this.buffer.slice(this.bufferAfterEscape).endsWith(this.modeEndSequence)) {
        this._addValueToLevel(this.stringProcessor(this.buffer.slice(0, -this.modeEndSequence.length)));
        this._startNormal();
      }
    }
  }
  _parseCommentBlockMode() {
    this.buffer += this.currentChar;
    if (this.buffer.endsWith(this.modeEndSequence)) {
      this._startNormal();
    } else if (this.buffer.length > PDParser.MAX_LIMITER_SIZE) {
      this.buffer = this.buffer.slice(this.buffer.length - this.modeEndSequence.length);
    }
  }
  _parseChar() {
    try {
      switch (this.mode) {
        case PDParser.MODE_NORMAL:
          this._parseNormalMode();
          break;
        case PDParser.MODE_STRING:
          this._parseStringMode();
          break;
        case PDParser.MODE_COMMENT_BLOCK:
          this._parseCommentBlockMode();
          break;
      }
      if (this.currentChar === '\n') {
        this.linePos++;
        this.charPos = 1;
      } else {
        this.charPos++;
      }
    } catch (e) {
      throw new Error(`Parsing error on line ${this.linePos}:${this.charPos}:\n${e.message}`)
    }
  }
  parseString(input) {
    for (const c of input) {
      this.currentChar = c;
      this._parseChar();
      // this.debug()
    }
  }
  /**
   * two modes
   * mode 1 ignores escape mode if active, adds any unfinished string to the level if string mode, ends any non base level and processes any buffer if one exists
   * mode 2 errors if escape mode is active, erros any unfinished string if string mode, error if in a non base level but processes any current buffer if one exists
   */

  /**
   * Closes the current processing in one of two ways
   * 
   * If `ignoreUnfinished` is `false` (default mode) then:
   *   * If in comment block mode - closes the current comment 
   *   * If in string mode - throws a Open String error
   *   * If in normal mode - processes the current buffer and adds it to the current level
   *   * If any levels are currently being processed, it throws an Open Block error
   * 
   * 
   * If `ignoreUnfinished` is `true` then:
   *   * If in comment block mode - closes the current comment 
   *   * If in string mode - closes any procesing string and adds it to the current level
   *   * If in normal mode - processes the current buffer and adds it to the current level
   *   * If any levels are currently being processed, it finishes and processes them until it reaches the base level
   * 
   * @param {boolean} ignoreUnfinished 
   */
  emit(ignoreUnfinished = false) {
    try {
      this.escapeMode = false;
      if (ignoreUnfinished) {
        if (this.mode === PDParser.MODE_COMMENT_BLOCK) {
          this._startNormal();
        } else if (this.mode === PDParser.MODE_STRING) {
          this._addValueToLevel(this.stringProcessor(this.buffer));
          this._startNormal();
        } else {
          this._processNormalBuffer();
        }

        if (this.levels.length) {
          while (this.levels.length) {
            this._endLevel();
          }
        }
      } else {
        if (this.mode === PDParser.MODE_COMMENT_BLOCK) {
          this._startNormal();
        } else if (this.mode === PDParser.MODE_STRING) {
          throw new Error("Open String");
        } else {
          this._processNormalBuffer();
        }

        if (this.levels.length) {
          throw new Error(`Open '${this.levelBlock.name}' Block`);
        }
      }
      return this._endLevel();
    } finally {
      this.reset();
    }
  }
  reset() {
    this.charPos = 1;
    this.linePos = 1;
    this.levels = [];
    this.currentLevel = this.baseLevel;
    this.mode = PDParser.MODE_NORMAL;
    this.modeEndSequence = "";
    this.buffer = "";
    this.escapeMode = false;
    this.bufferAfterEscape = 0;
    this.currentChar = "";
    this._createBaseLevel();
  }
  debug() {
    console.log("--DEBUG-SRT--");
    console.log(`currentChar:${JSON.stringify(this.currentChar)}`);
    console.log(`currentLevel:${JSON.stringify(this.currentLevel)}`);
    console.log(`mode:${JSON.stringify(this.mode)}`);
    console.log(`buffer:${JSON.stringify(this.buffer)}`);
    console.log("--DEBUG-END--");
  }
}

//TODO create a proper type for the step object
//TODO Consider allowing for a way to define branching step paths d
/**
 * Creates a processor function for the given steps.
 * 
 * @param {(value:any)=>string} typeGetter function that converts the current value into a type string that will be used to check if the value is valid for the current step
 * @param {{[key:string]:(state:{step:number,[key:string]:any},value:any)=>void}[]} steps Array of objects that define the valid types of each step and their respective processor functions.
 * @returns {(state:{step:number,[key:string]:any},value:any)=>void}
 */
function generateStepProcessor(typeGetter, steps) {
  /** @type {(state:{step:number,[key:string]:any},value:any)=>void} */
  return (state, value) => {
    let type = typeGetter(value);

    if (steps[state.step][type]) {
      steps[state.step][type](state, value);
    } else {
      throw new Error(`Expected to be '${Object.keys(steps[state.step]).join("' or '")}', got '${type}'`);
    }

    if (state.step == steps.length - 1) {
      state.step = 0;
    } else {
      state.step++;
    }
  }
}


export class JsonLikeParser extends PDParser {
  constructor() {
    super({
      syntax: [
        Seperator.Multi(' ', '\t', '\n', '\r', ',', ':'),
        Keyword.Base("true", true),
        Keyword.Base("false", false),
        Keyword.Base("null", null),
        Keyword.Base("NaN", NaN),
      ],
      stringLimiters: ['"'],
      blocks: [
        {
          name: "Object", start: "{", end: "}",
          startFn: () => [],
          processFn: (state, value) => state.push(value),
          endFn: (values) => {
            const result = {};
            for (let i = 1; i < values.length; i += 2) {
              result[values[i - 1]] = values[i];
            }
            return result;
          }
        },
        { name: "Array", start: "[", end: "]", startFn: () => [], processFn: (state, value) => state.push(value), endFn: (values) => values }
      ],
      inlineComments: ["//"],
      commentBlocks: [{ start: "/*", end: "*/" }],
      baseBlock: { startFn: () => [], processFn: (state, value) => state.push(value), endFn: (values) => values[0] }
    })
  }
}

const COMMA = { ",": true };
const COLON = { ":": true };

class JsKeyword {
  constructor(keyword) {
    this.keyword = keyword;
  }
}

function jsParserType(value) {
  if (value === COMMA) {
    return ",";
  } else if (value === COLON) {
    return ":";
  } else if (value instanceof JsKeyword) {
    return "keyword";
  } else {
    return "value";
  }
}



export class JsObjectParser extends PDParser {
  constructor() {
    super({
      syntax: [
        Seperator.Multi(' ', '\t', '\n', '\r'),
        Seperator.Single(',', COMMA),
        Seperator.Single(':', COLON),
        Keyword.Base("true", true),
        Keyword.Base("false", false),
        Keyword.Base("null", null),
        Keyword.Base("NaN", NaN),
      ],
      stringLimiters: ['"'],
      blocks: [
        {
          name: "Object", start: "{", end: "}",
          startFn: () => ({ step: 0, param: null, result: {} }),
          processFn: generateStepProcessor(jsParserType, [
            {
              "value": (state, value) => state.param = value.toString(),
              "keyword": (state, value) => state.param = value.keyword,
            },
            {
              ":": () => { }
            },
            {
              "value": (state, value) => state.result[state.param] = value
            },
            {
              ",": () => { }
            }
          ]),
          endFn: (state) => {
            return state.result;
          }
        },
        {
          name: "Array", start: "[", end: "]",
          startFn: () => ({ step: 0, result: [] }),
          processFn: generateStepProcessor(jsParserType, [
            {
              "value": (state, value) => state.result.push(value)
            },
            {
              ",": () => { },
            }
          ]),
          endFn: (state) => {
            return state.result;
          }
        }
      ],
      inlineComments: ["//"],
      commentBlocks: [{ start: "/*", end: "*/" }],
      keywordProcessor: createNumberOrOtherProcessor(value => new JsKeyword(value)),
      baseBlock: {
        startFn: () => ({ value: undefined }),
        processFn: (state, value) => {
          if (state.value === undefined) {
            let type = jsParserType(value);
            if (type == "value") {
              state.value = value;
            } else {
              throw new Error(`Expected 'value', got '${type}'`);
            }
          } else {
            throw new Error("Data after value found")
          }
        },
        endFn: (state) => {
          if (state.value === undefined) {
            throw new Error("No Value processed.")
          }
          return state.value;
        }
      }
    })
  }
}

export class LispLikeParser extends PDParser {
  constructor() {
    super({
      syntax: [
        Seperator.Multi(' ', '\t', '\n', '\r', ','),
        Keyword.Base("true", true),
        Keyword.Base("false", false),
        Keyword.Base("null", null),
        Keyword.Base("NaN", NaN),
      ],
      stringLimiters: ['"'],
      blocks: [
        { name: "List", start: "(", end: ")", startFn: () => [], processFn: (state, value) => state.push(value), endFn: (values) => values }
      ],
      inlineComments: ["//"],
      commentBlocks: [{ start: "/*", end: "*/" }],
    })
  }
}

export const PartialDataParser = PDParser;

