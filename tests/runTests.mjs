import { runTests } from "../src/simpleTest.mjs";

import.meta.dirname

runTests({ outFile:`${import.meta.dirname}/../test.out`, paths: [`${import.meta.dirname}`], includes: [".test.mjs"] })