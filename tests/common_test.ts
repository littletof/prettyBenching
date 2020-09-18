import { testEach } from "./test_helpers.ts";
import { assertEquals } from "./test_deps.ts";

import { intersect, disjunct, stripColor } from "../common.ts";
import { colors } from "../deps.ts";

testEach<{ a: unknown[]; b: unknown[] }, unknown[]>("common.intersect", [
  { input: { a: [], b: [] }, result: [] },
  { input: { a: [1, 2, 3], b: [4, 5, 6] }, result: [] },
  { input: { a: [1, 2, 3], b: [3, 4, 5] }, result: [3] },
  { input: { a: [1, 2, 3], b: [1, 2, 3] }, result: [1, 2, 3] },
  { input: { a: [1, 2, 3], b: [2, 3, 4] }, result: [2, 3] },
  { input: { a: [1, 1, 1, 1, 2], b: [1] }, result: [1, 1, 1, 1] },
  { input: { a: [1, 2], b: [1, 1, 1, 1] }, result: [1] },
  { input: { a: [1, 2], b: [1, 1, 1, 2] }, result: [1, 2] },
], (testCase) => {
  assertEquals(
    intersect(testCase.input.a, testCase.input.b),
    testCase.result,
    testCase.desc,
  );
});

testEach<{ a: unknown[]; b: unknown[] }, unknown[]>("common.disjunct", [
  { input: { a: [], b: [] }, result: [] },
  { input: { a: [1, 2, 3], b: [4, 5, 6] }, result: [1, 2, 3] },
  { input: { a: [1, 2, 3], b: [3, 4, 5] }, result: [1, 2] },
  { input: { a: [1, 2, 3], b: [1, 2, 3] }, result: [] },
  { input: { a: [1, 2, 3], b: [2, 3, 4] }, result: [1] },
  { input: { a: [1, 1, 1, 1, 2], b: [1] }, result: [2] },
  { input: { a: [1, 2], b: [1, 1, 1, 1] }, result: [2] },
  { input: { a: [1, 2], b: [1, 1, 1, 2] }, result: [] },
], (testCase) => {
  assertEquals(
    disjunct(testCase.input.a, testCase.input.b),
    testCase.result,
    testCase.desc,
  );
});

testEach<string, string>("common.stripColor", [
  { input: "", result: "" },

  { input: colors.bgBlack("test"), result: "test" },
  { input: colors.bgBlue("test"), result: "test" },
  { input: colors.bgCyan("test"), result: "test" },
  { input: colors.bgGreen("test"), result: "test" },
  { input: colors.bgMagenta("test"), result: "test" },
  { input: colors.bgRed("test"), result: "test" },
  { input: colors.bgWhite("test"), result: "test" },
  { input: colors.bgYellow("test"), result: "test" },

  { input: colors.black("test"), result: "test" },
  { input: colors.blue("test"), result: "test" },
  { input: colors.cyan("test"), result: "test" },
  { input: colors.green("test"), result: "test" },
  { input: colors.magenta("test"), result: "test" },
  { input: colors.red("test"), result: "test" },
  { input: colors.white("test"), result: "test" },
  { input: colors.yellow("test"), result: "test" },

  {
    input: colors.red("testing " + colors.green("test")),
    result: "testing test",
  },
  { input: colors.green("⚗️"), result: "⚗️" },
  { input: colors.red("⚗️ " + colors.green("⚗️")), result: "⚗️ ⚗️" },
], (testCase) => {
  assertEquals(stripColor(testCase.input), testCase.result, testCase.desc);
});

// TODO calculateExtraMetrics
// TODO calculateStdDeviation
// TODO getBenchIndicator
// TODO getInThresholdRange
// TODO getTimeColor
// TODO substrColored
