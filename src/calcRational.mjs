//@ts-check

import { Rational, RationalNumber } from "./rational.mjs";

/**
 * @typedef {"+"|"-"|"*"|"/"|"^"} Op
 * @typedef {CalcEntry[]} Brackets
 * @typedef {Brackets|Op|RationalNumber|bigint|number|string} CalcEntry
 * @typedef {Brackets|Op|RationalNumber|bigint|number|string} ProcessedEntry
 */

const PRIORITY_2_OPS = ["^"];
const PRIORITY_1_OPS = ["*", "/"];
const PRIORITY_0_OPS = ["+", "-"];

const opMap = {
  "+": "add",
  "-": "sub",
  "*": "mul",
  "/": "div",
  "^": "pow",
}

function processOp(value1, value2, op) {
  return value1[opMap[op]](value2);
}

/**
 * 
 * @param {(RationalNumber|{op:Op,priority:number})[]} values 
 * @param {*} priority 
 */
function processCalcPriority(values, priority) {
  for (let i = 0; i < values.length; i++) {
    let v = values[i];
    if (v.priority === priority) {
      if ((values[i - 1] instanceof RationalNumber) && (values[i + 1] instanceof RationalNumber)) {
        values.splice(i - 1, 3, processOp(values[i - 1], values[i + 1], v.op))
        i--;
      } else {
        throw Error("missing op values");
      }
    }
  }
}

/**
 * 
 * @param  {...CalcEntry} values 
 * @returns {RationalNumber}
 */
export function calc(...values) {
  let processedInput = values.map(v => {
    if (v instanceof Array) {
      return calc(...v);
    } else if (v instanceof RationalNumber) {
      return v;
    } else if (PRIORITY_2_OPS.includes(v)) {
      return { op: v, priority: 2 };
    } else if (PRIORITY_1_OPS.includes(v)) {
      return { op: v, priority: 1 };
    } else if (PRIORITY_0_OPS.includes(v)) {
      return { op: v, priority: 0 };
    } else {
      return Rational(v);
    }
  });
  processCalcPriority(processedInput, 2);
  processCalcPriority(processedInput, 1);
  processCalcPriority(processedInput, 0);
  if (processedInput.length == 1) {
    return (/** @type {RationalNumber}*/processedInput[0]);
  } else {
    throw Error("too many values");
  }
}
