import { testEach } from "./test_helpers.ts";
import { assertEquals } from "./test_deps.ts";

import {
  perc,
  isFloat,
  rtime,
  matchWithIndex,
  num,
} from "../utils.ts";

testEach<number, string>("utils.perc", [
  { input: 0.10098, result: "0.1", desc: "should convert to 1dec precision" },
  { input: 20.00098, result: "20.0", desc: "should convert to 1dec precision" },
  { input: 0.263548, result: "0.3", desc: "should round up values" },
  { input: 65.263548, result: "65.3", desc: "should round up values" },
  { input: 99.94, result: "99.9", desc: "should only display 100% as integer" },
  { input: 99.9999, result: "100", desc: "should display 100% as integer" },
  { input: 99.95, result: "100", desc: "should display 100% as integer" },
], (testCase) => {
  assertEquals(perc(testCase.input), testCase.result, testCase.desc);
});

testEach<number, boolean>("utils.isFloat", [
  { input: 0.10098, result: true },
  { input: 20.00098, result: true },
  { input: 4, result: false },
  { input: 65.000000, result: false },
  { input: 99.000, result: false },
], (testCase) => {
  assertEquals(isFloat(testCase.input), testCase.result, testCase.desc);
});

testEach<{ value: number; from?: number }, string>("utils.rtime", [
  { input: { value: 0.121244 }, result: "0.1212" },
  { input: { value: 10.121244 }, result: "10.121" },
  { input: { value: 100.121244 }, result: "100.12" },
  { input: { value: 1000.121244 }, result: "1000.1" },
  { input: { value: 10000.121244 }, result: "10000" },
  { input: { value: 100000.121244 }, result: "100000" },

  { input: { value: 0.121244, from: 2 }, result: "0.1212" },
  { input: { value: 10.121244, from: 2 }, result: "10.1212" },
  { input: { value: 100.121244, from: 2 }, result: "100.1212" },
  { input: { value: 1000.121244, from: 2 }, result: "1000.121" },
  { input: { value: 10000.121244, from: 2 }, result: "10000.12" },
  { input: { value: 100000.121244, from: 2 }, result: "100000.1" },
  { input: { value: 1000000.121244, from: 2 }, result: "1000000" },
], (testCase) => {
  assertEquals(
    rtime(testCase.input.value, testCase.input.from),
    testCase.result,
    testCase.desc,
  );
});

testEach<{ str: string; regexp: RegExp }, number[]>("utils.matchWithIndex", [
  {
    input: { str: "abababa", regexp: /b/ },
    exception: {
      msg:
        "Too many matches. Something bad with the regexp. Did you forgot the global? / /g",
    },
    desc: "should throw exception before infinity loop",
  },
  { input: { str: "abababa", regexp: /b/g }, result: [1, 3, 5] },
  { input: { str: "abababa", regexp: /a/g }, result: [0, 2, 4, 6] },
  { input: { str: "ababcac", regexp: /ab/g }, result: [0, 2] },
  // TODO something wrong? { input: {str: 'aaabcac', regexp: /aa/g}, result: [0,1]},
  // { input: {str: '', regexp: / /}, result: []},
], (testCase) => {
  assertEquals(
    matchWithIndex(testCase.input.str, testCase.input.regexp),
    testCase.result,
    testCase.desc,
  );
});

testEach<number, string>("utils.num", [
  { input: 0.10098, result: "0.1010" },
  { input: 0.111, result: "0.1110" },
  { input: 111, result: "111" },
  { input: 111.000, result: "111" },
  { input: 111.00009, result: "111.0001" },
], (testCase) => {
  assertEquals(num(testCase.input), testCase.result, testCase.desc);
});

// TODO lDiff
// TODO padEndVisible
// TODO padStartVisible
