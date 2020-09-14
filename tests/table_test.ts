import { testEach } from "./test_helpers.ts";
import { assertEquals } from "./test_deps.ts";
import { TableBuilder } from "../table.ts";

testEach<{ w: number; ops: (tb: TableBuilder) => void }, string>(
  "table",
  [
    {
      input: {
        w: 1,
        ops: (tb) => {
          tb.line("1");
        },
      },
      result: `┌─┐\n│1│\n└─┘\n`,
    },
    {
      input: {
        w: 5,
        ops: (tb) => {
          tb.line("1");
        },
      },
      result: `┌─────┐\n│1    │\n└─────┘\n`,
    },
    {
      input: {
        w: 5,
        ops: (tb) => {
          tb.line("1");
          tb.line("2");
        },
      },
      result: `┌─────┐\n│1    │\n│2    │\n└─────┘\n`,
    },
    {
      input: {
        w: 5,
        ops: (tb) => {
          tb.line("1");
          tb.separator();
          tb.line("2");
        },
      },
      result: `┌─────┐\n│1    │\n├─────┤\n│2    │\n└─────┘\n`,
    },
    {
      input: {
        w: 2,
        ops: (tb) => {
          tb.line("1");
          tb.line("2");
          tb.separator();
          tb.line("3");
        },
      },
      result: `┌──┐\n│1 │\n│2 │\n├──┤\n│3 │\n└──┘\n`,
    },
    {
      input: {
        w: 3,
        ops: (tb) => {
          tb.cellLine("1", "2");
        },
      },
      result: `┌─┬─┐\n│1│2│\n└─┴─┘\n`,
    },
    {
      input: {
        w: 3,
        ops: (tb) => {
          tb.cellLine("1", "2");
          tb.cellLine("4", "5");
        },
      },
      result: `┌─┬─┐\n│1│2│\n│4│5│\n└─┴─┘\n`,
    },
    {
      input: {
        w: 3,
        ops: (tb) => {
          tb.cellLine("1", "2");
          tb.separator();
          tb.cellLine("4", "5");
        },
      },
      result: `┌─┬─┐\n│1│2│\n├─┼─┤\n│4│5│\n└─┴─┘\n`,
    },
    {
      input: {
        w: 6,
        ops: (tb) => {
          tb.cellLine("1", "2");
          tb.separator();
          tb.cellLine("4   ", "5");
        },
      },
      result: `┌─┬────┐\n│1│2   │\n├─┴──┬─┤\n│4   │5│\n└────┴─┘\n`,
    },
    {
      input: {
        w: 9,
        ops: (tb) => {
          tb.line("    1    ");
          tb.separator();
          tb.cellLine("2 ", " 3 ", " 4");
          tb.separator();
          tb.cellLine("  5 ", " 6 ");
        },
      },
      result:
        `┌─────────┐\n│    1    │\n├──┬───┬──┤\n│2 │ 3 │ 4│\n├──┴─┬─┴──┤\n│  5 │ 6  │\n└────┴────┘\n`,
    },
    {
      input: {
        w: 9,
        ops: (tb) => {
          tb.line("    1    ");
          tb.separator();
          tb.cellLine("2 ", " 3 ", " 4");
          tb.separator();
          tb.cellLine("  5 ", " 6 ");
          tb.separator();
          tb.line("  7 │ 8  ");
        },
      },
      result:
        `┌─────────┐\n│    1    │\n├──┬───┬──┤\n│2 │ 3 │ 4│\n├──┴─┬─┴──┤\n│  5 │ 6  │\n├────┼────┤\n│  7 │ 8  │\n└────┴────┘\n`,
    },
  ],
  (testCase) => {
    const tb = new TableBuilder(
      testCase.input.w,
      ((str) => str),
    );
    testCase.input.ops(tb);
    const out = tb.build();
    // console.log("\n" + out);
    assertEquals(out, testCase.result);

    // TODO fix color testing
    /* const tbCol = new TableBuilder(
      testCase.input.w,
      colors.green,
    );
    testCase.input.ops(tbCol);
    const outCol = tbCol.build();
    console.log(outCol);
    const colored = testCase.result?.replaceAll(/([┌┬─┐│└┴─┘├┼┤])/g, colors.green('$1'));
    console.log(colored);
    assertEquals(outCol, colored); */
  },
);
