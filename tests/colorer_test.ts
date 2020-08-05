import { testEach } from "./test_helpers.ts";
import { assertEquals } from "./test_deps.ts";

import { Colorer } from "../colorer.ts";
import { colors } from "../deps.ts";

testEach<{ fn: (str: string) => string; str: string }, (str: string) => string>(
  "colorer.colors",
  [
    { input: { fn: new Colorer().black, str: "test" }, result: colors.black },
    { input: { fn: new Colorer().blue, str: "test" }, result: colors.blue },
    { input: { fn: new Colorer().cyan, str: "test" }, result: colors.cyan },
    { input: { fn: new Colorer().gray, str: "test" }, result: colors.gray },
    { input: { fn: new Colorer().green, str: "test" }, result: colors.green },
    {
      input: { fn: new Colorer().magenta, str: "test" },
      result: colors.magenta,
    },
    { input: { fn: new Colorer().red, str: "test" }, result: colors.red },
    { input: { fn: new Colorer().white, str: "test" }, result: colors.white },
    { input: { fn: new Colorer().yellow, str: "test" }, result: colors.yellow },

    { input: { fn: new Colorer().yellow, str: "🦕" }, result: colors.yellow },
    { input: { fn: new Colorer().blue, str: "🚀" }, result: colors.blue },
    { input: { fn: new Colorer().red, str: "⚗️" }, result: colors.red },
  ],
  (testCase) => {
    assertEquals(
      testCase.input.fn(testCase.input.str),
      testCase.result!(testCase.input.str),
      testCase.desc,
    );
  },
);

Deno.test({
  name: "colorer.doColor",
  fn() {
    const c = new Colorer();
    assertEquals(c.green("test"), colors.green("test"));
    c.setColorEnabled(false);
    assertEquals(c.green("test"), "test");
  },
});
