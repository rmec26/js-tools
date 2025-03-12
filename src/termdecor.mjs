
let inneDepth = 0;
let isLineStart = true;
let isLineEmpty = false;
let tSize = 2;
let recordId = 0;
let recordList = [];
let showOut = true;
let lineCount = 0;
let lineCountStart = "";
let lineCountEnd = ". ";
let lineCountActive = false;
let overrideLineCount = null;
let lineCountPadding = 4;
let consoleLog = null;

const termColor = (clr, str) => {
  return str.length ? `\u001b[${clr}m${normalizeAll(str)}\u001b[m` : `\u001b[${clr}m`;
}

export const Color = {
  Reset: () => termColor("", []),
  Foreground: {
    Black: (...str) => termColor("30", str),
    Red: (...str) => termColor("31", str),
    Green: (...str) => termColor("32", str),
    Yellow: (...str) => termColor("33", str),
    Blue: (...str) => termColor("34", str),
    Magenta: (...str) => termColor("35", str),
    Cyan: (...str) => termColor("36", str),
    White: (...str) => termColor("37", str),
    BrBlack: (...str) => termColor("90", str),
    BrRed: (...str) => termColor("91", str),
    BrGreen: (...str) => termColor("92", str),
    BrYellow: (...str) => termColor("93", str),
    BrBlue: (...str) => termColor("94", str),
    BrMagenta: (...str) => termColor("95", str),
    BrCyan: (...str) => termColor("96", str),
    BrWhite: (...str) => termColor("97", str),
  },
  Backgroud: {
    Black: (...str) => termColor("40", str),
    Red: (...str) => termColor("41", str),
    Green: (...str) => termColor("42", str),
    Yellow: (...str) => termColor("43", str),
    Blue: (...str) => termColor("44", str),
    Magenta: (...str) => termColor("45", str),
    Cyan: (...str) => termColor("46", str),
    White: (...str) => termColor("47", str),
    BrBlack: (...str) => termColor("100", str),
    BrRed: (...str) => termColor("101", str),
    BrGreen: (...str) => termColor("102", str),
    BrYellow: (...str) => termColor("103", str),
    BrBlue: (...str) => termColor("104", str),
    BrMagenta: (...str) => termColor("105", str),
    BrCyan: (...str) => termColor("106", str),
    BrWhite: (...str) => termColor("107", str),
  }
}

function normalizeAll(vals) {
  return vals.map(v => v && typeof v === "object" ? JSON.stringify(v) : "" + v).join("")
}

function processWrite(text) {
  if (showOut) {
    process.stdout.write(text);
  }
  for (let [_, removeColors, r] of recordList) {
    if (removeColors) {
      text = text.replaceAll(/\u001b\[\d*m/g, "");
    }
    if (typeof r === "function") {
      r(text);
    } else {
      r.push(text);
    }
  }
}

function linePrint(line) {
  if (isLineStart) {
    lineCount++;
    if (lineCountActive) {
      processWrite(overrideLineCount ? overrideLineCount : `${lineCountStart}${lineCount.toString().padStart(lineCountPadding)}${lineCountEnd}`);
    }
    isLineStart = false;
  }

  if (line) {
    if (isLineEmpty) {
      processWrite("".padEnd(tSize * inneDepth));
      isLineEmpty = false;
    }
    processWrite(line);
  }
}

export function print(...values) {
  if (values.length) {
    let lines = normalizeAll(values).split("\n");
    linePrint(lines.shift());
    for (const line of lines) {
      processWrite("\n");
      isLineStart = true;
      isLineEmpty = true;
      if (line) {
        linePrint(line);
      }
    }
  }
}

export function println(...values) {
  print(...values, "\n")
}

export const TermDecor = {
  show: () => { showOut = true },
  hide: () => { showOut = false },
  tabSize: (size = 2) => {
    tSize = size;
    if (tSize < 1) {
      tSize = 1;
    }
  },
  tab: (depth = 1) => {
    inneDepth += depth | 0;
  },
  untab: (depth = 1) => {
    inneDepth -= depth | 0;
    if (inneDepth < 0) {
      inneDepth = 0;
    }
  },
  record: (fn, removeColors = false) => {
    let id = recordId++;
    if (typeof fn === "function") {
      recordList.push([id, removeColors, fn]);
    } else {
      recordList.push([id, removeColors, []]);
    }
    return id;
  },
  stopRecord(id) {
    for (let i = 0; i < recordList.length; i++) {
      let [rId, _, record] = recordList[i];
      if (rId === id) {
        recordList.splice(i, 1);
        if (record instanceof Array) {
          return record.join("");
        }
        return;
      }
    }
  },
  print,
  println,
  log:println,
  info: (...values) => print(Color.Foreground.Cyan(...values), "\n"),
  warning: (...values) => print(Color.Foreground.Yellow(...values), "\n"),
  error: (...values) => print(Color.Foreground.Red(...values), "\n"),
  Color,
  FColor: Color.Foreground,
  BColor: Color.Backgroud,
  RColor: Color.Reset,
  showLineCount: () => lineCountActive = true,
  hideLineCount: () => lineCountActive = false,
  resetLineCount: () => lineCount = 0,
  setLineCountStart: (start = "") => {
    lineCountStart = start
  },
  setLineCountEnd: (end = ". ") => {
    lineCountEnd = end
  },
  setLineCountPadding: (padding = 4) => {
    lineCountPadding = padding | 0
  },
  setOverrideLineCount: (override = null) => {
    overrideLineCount = override
  },
  captureConsoleLog: () => {
    if (!consoleLog) {
      consoleLog = console.log;
      console.log = println;
    }
  },
  releaseConsoleLog: () => {
    if (consoleLog) {
      console.log = consoleLog;
      consoleLog = null;
    }
  },
}
