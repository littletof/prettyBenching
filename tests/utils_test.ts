import { testEach } from "./test_helpers.ts";
import { assertEquals } from "./test_deps.ts";

import {
  isFloat,
  lDiff,
  matchWithIndex,
  num,
  padEndVisible,
  padStartVisible,
  perc,
  rtime,
} from "../utils.ts";
import { colors } from "../deps.ts";

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

testEach<string, number>("utils.lDiff", [
  { input: "[", result: 0 },
  { input: "[[", result: 0 },
  { input: ".[", result: 0 },
  { input: colors.red(""), result: 10 },
  { input: colors.red("test"), result: 10 },
  { input: colors.blue(colors.red("")), result: 20 },
  { input: colors.blue(colors.red("test")), result: 20 },

  { input: colors.blue("another" + colors.red("test")), result: 20 },
  {
    input: colors.blue(colors.green("green") + colors.red("test")),
    result: 30,
  },
  {
    input: colors.blue(colors.green("green") + "and some" + colors.red("test")),
    result: 30,
  },

  { input: "#", result: 0 },
  {
    input: "⚗",
    result: 0,
    desc: "some chars are icons without any extra char",
  },
  {
    input: "⚗\uFE0E",
    result: 0,
    desc: "should calc extra char so it behaves like emojis",
  },
  { input: "⚗\uFE0E⚗\uFE0E", result: 0 },
  { input: "‼️", result: 0, desc: "this has \uFE0E hidden char too." },
  { input: "\u{1F9EA}", result: 0 },
  { input: "🧪⚗️🈴🚀🦕⚗", result: 0 },
  { input: "\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E", result: 0 },
  { input: "\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E⚗\uFE0E", result: 0 },
  { input: colors.green("⚗\uFE0E"), result: 10 },
  { input: colors.green("‼️‼️"), result: 10 },
  { input: colors.green("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E"), result: 10 },
  { input: colors.green("⚗\uFE0E ") + colors.red(" ⚗\uFE0E"), result: 20 },
  {
    input: colors.green("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E") + "-⚗\uFE0E-" +
      colors.blue("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E"),
    result: 20,
  },
], (testCase) => {
  assertEquals(lDiff(testCase.input), testCase.result /* , testCase.desc */);
});

testEach<{ str: string; to: number }, string>("utils.padStartVisible", [
  { input: { str: "", to: 4 }, result: "...." },
  { input: { str: "#", to: 4 }, result: "...#" },
  { input: { str: "⚗", to: 4 }, result: "...⚗" },
  { input: { str: "⚗\uFE0E", to: 4 }, result: "..⚗\uFE0E" },
  { input: { str: "⚗\uFE0E⚗\uFE0E", to: 4 }, result: "⚗\uFE0E⚗\uFE0E" },
  { input: { str: "‼️", to: 4 }, result: "..‼️" },
  { input: { str: "\u{1F9EA}", to: 4 }, result: "..\u{1F9EA}" }, // 6
  { input: { str: "\u{1F9EA}⚗️🈴🚀🦕⚗", to: 9 }, result: "\u{1F9EA}⚗️🈴🚀🦕⚗" },
  { input: { str: "\u{1F9EA}⚗️🈴🚀🦕⚗", to: 15 }, result: "....\u{1F9EA}⚗️🈴🚀🦕⚗" },
  {
    input: { str: "\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E", to: 15 },
    result: "...\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E",
  },
  {
    input: { str: "\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E⚗\uFE0E", to: 15 },
    result: ".\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E⚗\uFE0E",
  },
  {
    input: { str: colors.green("⚗\uFE0E"), to: 4 },
    result: ".." + colors.green("⚗\uFE0E"),
  }, // 11
  {
    input: { str: colors.green("‼️‼️"), to: 5 },
    result: "." + colors.green("‼️‼️"),
  },
  {
    input: { str: colors.green("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E"), to: 15 },
    result: "..." + colors.green("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E"),
  },
  {
    input: { str: colors.green("⚗\uFE0E_") + colors.red(".⚗\uFE0E"), to: 7 },
    result: "." + colors.green("⚗\uFE0E_") + colors.red(".⚗\uFE0E"),
  },
  {
    input: {
      str: colors.green("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E") + "-⚗\uFE0E-" +
        colors.blue("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E"),
      to: 31,
    },
    result: "..." + colors.green("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E") + "-⚗\uFE0E-" +
      colors.blue("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E"),
  },
], (testCase) => {
  assertEquals(
    padStartVisible(testCase.input.str, testCase.input.to, "."),
    testCase.result,
    testCase.desc,
  );
});

testEach<{ str: string; to: number }, string>("utils.padEndVisible", [
  { input: { str: "", to: 4 }, result: "...." },
  { input: { str: "%", to: 4 }, result: "%..." },
  {
    input: { str: Array(8).fill("=").join(""), to: 11 },
    result: "========...",
  },
  {
    input: { str: colors.green(Array(8).fill("=").join("")), to: 11 },
    result: colors.green("========") + "...",
  },
  { input: { str: "#", to: 4 }, result: "#..." },
  { input: { str: "⚗", to: 4 }, result: "⚗..." },
  { input: { str: "⚗\uFE0E", to: 4 }, result: "⚗\uFE0E.." }, // 6
  { input: { str: "⚗\uFE0E⚗\uFE0E", to: 5 }, result: "⚗\uFE0E⚗\uFE0E." },
  { input: { str: "‼️", to: 4 }, result: "‼️.." },
  { input: { str: "\u{1F9EA}", to: 4 }, result: "\u{1F9EA}.." },
  { input: { str: "\u{1F9EA}⚗️🈴🚀🦕⚗", to: 9 }, result: "\u{1F9EA}⚗️🈴🚀🦕⚗" },
  { input: { str: "\u{1F9EA}⚗️🈴🚀🦕⚗", to: 15 }, result: "\u{1F9EA}⚗️🈴🚀🦕⚗...." },
  {
    input: { str: "\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E", to: 15 },
    result: "\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E...",
  },
  {
    input: { str: "\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E⚗\uFE0E", to: 15 },
    result: "\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E⚗\uFE0E.",
  },
  {
    input: { str: colors.green("⚗\uFE0E"), to: 4 },
    result: colors.green("⚗\uFE0E") + "..",
  }, // 14
  {
    input: { str: colors.green("‼️‼️"), to: 5 },
    result: colors.green("‼️‼️") + ".",
  },
  {
    input: { str: colors.green("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E"), to: 15 },
    result: colors.green("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E") + "...",
  },
  {
    input: { str: colors.green("⚗\uFE0E_") + colors.red(".⚗\uFE0E"), to: 7 },
    result: colors.green("⚗\uFE0E_") + colors.red(".⚗\uFE0E") + ".",
  },
  {
    input: {
      str: colors.green("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E") + "-⚗\uFE0E-" +
        colors.blue("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E"),
      to: 31,
    },
    result: colors.green("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E") + "-⚗\uFE0E-" +
      colors.blue("\u{1F9EA}⚗️🈴🚀🦕⚗\uFE0E") + "...",
  },
], (testCase) => {
  assertEquals(
    padEndVisible(testCase.input.str, testCase.input.to, "."),
    testCase.result,
    testCase.desc,
  );
});
