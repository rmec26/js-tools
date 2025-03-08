import { runTests } from "../src/simpleTest.mjs";

const paths = process.argv.length > 2 ? process.argv.slice(2) : [`${import.meta.dirname}`]


runTests({ outFile: `${import.meta.dirname}/../test.out`, paths, includes: [".test.mjs"] })