//@ts-check
import { normalize, resolve } from "path";
import { TermDecor } from "./termdecor.mjs";
import * as fs from "fs";

const term = TermDecor;
const color = term.FColor;

let testCount = 0;
let testList = [];
let passCount = 0;
let failCount = 0;
let errorCount = 0;
let testLevel = [];

class FailError extends Error { };

export function describe(name, fn) {
  const initialCount = testCount;
  const initialPassCount = passCount;
  term.println(color.Cyan("-"), " Describe ", name);
  term.tab();
  testLevel.push(testList);
  testList = [];
  let result = "PASS";
  try {
    fn();
    const finalCount = testCount - initialCount;
    const finalPassCount = passCount - initialPassCount;
    if (finalCount > finalPassCount) {
      result = `FAIL ${finalCount - finalPassCount}/${finalCount}`;
    } else {
      result += ` ${finalCount}/${finalCount}`
    }
  } catch (e) {
    result = "ERROR";
    term.println(e.stack);
  }
  term.untab();
  const finalList = testList
  testList = testLevel.pop();
  testList.push([name, result, finalList]);
}

export function test(name, fn) {
  term.tab();
  term.println(color.Yellow("*"), " Testing ", name);
  try {
    fn()
    testCount++;
    passCount++;
    testList.push([name, "PASS"]);
  } catch (e) {
    if (e instanceof FailError) {
      testCount++;
      failCount++;
      testList.push([name, "FAIL"]);
    } else {
      testCount++;
      errorCount++;
      testList.push([name, "ERROR"]);
    }
    term.println(e.stack);
  }
  term.untab();
}

function typeOf(a) {
  /** @type {string} */
  let aType = typeof a;
  if (aType === "object") {
    if (a) {
      if (a instanceof Array) {
        aType = "array";
      }
    } else {
      aType = "null";
    }
  }
  return aType;
}

function keyDiff(expected, actual) {
  const expectedKeys = Object.keys(expected);
  const actualKeys = Object.keys(actual);
  const expectedOnly = [];
  for (let k of expectedKeys) {
    let pos = actualKeys.indexOf(k)
    if (pos === -1) {
      expectedOnly.push(k);
    } else {
      actualKeys.splice(pos, 1);
    }
  }
  return [expectedOnly, actualKeys];
}

function diff(expected, actual, path = "") {
  const expectedType = typeOf(expected);
  const actualType = typeOf(actual);
  if (expectedType !== actualType) {
    return `expected${path} is of type '${expectedType}' while actual${path} is of type '${actualType}'`;
  }
  if (expectedType === "object") {
    let entries = Object.entries(expected);
    let [expectedOnly, actualOnly] = keyDiff(expected, actual);
    if (expectedOnly.length) {
      if (actualOnly.length) {
        return `actual${path} is missing the keys ${expectedOnly.map(v => `'${v}'`).join(", ")}, while having the extra keys ${actualOnly.map(v => `'${v}'`).join(", ")}`;
      }
      return `actual${path} is missing the keys ${expectedOnly.map(v => `'${v}'`).join(", ")}`;
    } else if (actualOnly.length) {
      return `actual${path} has the extra keys ${actualOnly.map(v => `'${v}'`).join(", ")}`;
    }
    for (let [k, v] of entries) {
      let result = diff(v, actual[k], `${path}.${k}`);
      if (result) {
        return result;
      }
    }
  } else if (expectedType === "array") {
    if (expected.length !== actual.length) {
      return `expected${path} has length of ${expected.length} entries while actual${path} has length of ${actual.length}`;
    }
    for (let i = 0; i < expected.length; i++) {
      let result = diff(expected[i], actual[i], `${path}.${i}`);
      if (result) {
        return result;
      }
    }
  } else if (expected !== actual) {
    return `expected${path} is ${JSON.stringify(expected)} while actual${path} is ${JSON.stringify(actual)}`;
  }
  return "";
}

function isEqual(expected, actual) {
  const fail = reason => {
    throw new FailError(`${reason}:\nExpected: ${color.Green(JSON.stringify(expected, null, 2))}\n  Actual: ${color.Red(JSON.stringify(actual, null, 2))}`);
  }
  const expectedType = typeOf(expected);
  const actualType = typeOf(actual);
  if (expectedType === actualType) {
    let diffResult = diff(expected, actual);
    if (diffResult) {
      fail(diffResult);
    }
  } else {
    fail(`Expected value is of type '${expectedType}', while Actual value is of type '${actualType}'.`);
  }
}

export function expect(actual) {
  return {
    toEqual: (expected) => {
      isEqual(expected, actual);
    },
    toNotEqual: (expected) => {
      let passed = false;
      try {
        isEqual(expected, actual);
        passed = true;
      } catch (_) { }
      if (passed) {
        fail(`Expected and Actual values are equal when they shouldn't be.`);
      }
    },
    toBeTrue: () => {
      isEqual(true, actual);
    },
    toBeFalse: () => {
      isEqual(false, actual);
    },
    toBeNull: () => {
      isEqual(null, actual);
    },
    toExist: () => {
      actual !== undefined && actual !== null;
    },
    toThrow: (expectedError = "") => {
      let passed = false;
      if (typeOf(actual) === "function") {
        try {
          actual();
          passed = true;
        } catch (e) {
          if (!e.message.includes(expectedError)) {
            fail(`Function threw an error but the message doesn't contain the expected text.:\nExpected: ${color.Green(expectedError)}\n  Actual: ${color.Red(e.message)}`);
          }
        }
        if (passed) {
          fail(`Function ran without errors.`);
        }
      } else {
        throw Error("No function given to run a toThrowError expect.")
      }
    }
  }
}


export function fail(reason = "Unknown reason") {
  throw new FailError(reason);
}


function describeRender(list, name = null, result, depth = 0) {
  if (name !== null) {
    term.println(color.Cyan("-"), ` ${name}: `, result.startsWith("PASS") ? color.Green(result) : color.Red(result))
    term.tab();
  }
  list.forEach(([name, result, list]) => {
    //is a describe
    if (list) {
      describeRender(list, name, result, depth);
    } else {
      term.println(color.Yellow("*"), ` ${name}: `, result === "PASS" ? color.Green(result) : color.Red(result))
    }
  });
  term.untab();


}

export function finalResults() {
  term.println("\n\nFinal Results:\n");
  describeRender(testList);
  term.println("\nOf ", color.Cyan(testCount), " tests, ",
    passCount === testCount ? color.Green(passCount) : color.Yellow(passCount), " passed, ",
    failCount === 0 ? color.Green(failCount) : color.Red(failCount), " failed and ",
    errorCount === 0 ? color.Green(errorCount) : color.Red(errorCount), " errored.");
  process.exit(failCount + errorCount);
}

function getTestList(paths, includes) {
  let testList = [];
  for (let path of paths) {
    path = resolve(path);
    let stat = fs.statSync(path);
    if (stat.isFile() && !testList.includes(path)) {
      if (!includes?.length || includes.some(part => path.includes(part))) {
        testList.push(path);
      }
    } else if (stat.isDirectory()) {
      for (let filePath of fs.readdirSync(path, { recursive: true })) {
        let finalPath = normalize(`${path}/${filePath}`);
        if (fs.statSync(finalPath).isFile() && !testList.includes(finalPath)) {
          if (!includes?.length || includes.some(part => finalPath.includes(part))) {
            testList.push(finalPath);
          }
        }
      }
    }
  }
  return testList;
}

export async function runTests({ outFile = "", paths = [], includes = [] }) {
  if (outFile) {
    fs.writeFileSync(outFile, "");
    term.record(text => {
      fs.appendFileSync(outFile, text);
    }, true);
  }

  term.println("Simple Test Runner\n");

  const testFiles = getTestList(paths, includes);

  for (let test of testFiles) {
    try{
      await import(test)
    }catch(e){
      term.error(`Error while loading test file '${test}':\n${e.stack}`)
    }
  }
  finalResults()
}

