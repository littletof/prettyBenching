import {
  ColumnDefinition,
  defaultColumns,
  extraMetricsColumns,
  GroupDefinition,
  indicatorColumn,
  prettyBenchmarkDown,
  thresholdResultColumn,
  thresholdsColumn,
} from "https://deno.land/x/pretty_benching@v0.3.1/pretty_benchmark_down.ts";

import {
  bench,
  BenchmarkResult,
  BenchmarkRunResult,
  runBenchmarks,
} from "https://deno.land/std@0.82.0/testing/bench.ts";

import * as colors from "https://deno.land/std@0.82.0/fmt/colors.ts";
import type { BenchIndicator, Thresholds } from "../../types.ts";

bench({
  name: "Sorting arrays",
  runs: 4000,
  func(b): void {
    b.start();
    new Array(10000).fill(Math.random()).sort();
    b.stop();
  },
});

bench({
  name: "Ungrouped 1",
  runs: 1000,
  func(b): void {
    b.start();
    let a = new Array(500);
    for (let i = 0; i < 500; i++) {
      a.pop();
      a = a.reverse();
    }
    b.stop();
  },
});

bench({
  name: "Ungrouped 2",
  runs: 1000,
  func(b): void {
    b.start();
    let a = new Array(500);
    for (let i = 0; i < 500; i++) {
      a.pop();
      a = a.reverse();
    }
    b.stop();
  },
});

bench({
  name: "Rotating other things",
  runs: 1000,
  func(b): void {
    b.start();
    let a = new Array(500);
    for (let i = 0; i < 500; i++) {
      a.pop();
      a = a.reverse();
    }
    b.stop();
  },
});

bench({
  name: "Rotating arrays",
  runs: 1000,
  func(b): void {
    b.start();
    let a = new Array(500);
    for (let i = 0; i < 500; i++) {
      a.pop();
      a = a.reverse();
    }
    b.stop();
  },
});

bench({
  name: "Proving NP==P",
  runs: 1,
  func(b): void {
    b.start();
    for (let i = 0; i < 1e9 / 5; i++) {
      const NPeP = Math.random() === Math.random();
    }
    b.stop();
  },
});

bench({
  name: "Counting stars_long",
  runs: 1000,
  func(b): void {
    b.start();
    const a = [];
    for (let i = 0; i < 1e12; i++) {
      a.push(i);
    }
    b.stop();
  },
});

bench({
  name: "Standing out",
  runs: 1000,
  func(b): void {
    b.start();
    new Array(10000).fill(Math.random()).sort();
    b.stop();
  },
});

const thresholds: Thresholds = {
  "Rotating arrays": { green: 3.5, yellow: 4.4 },
  "Sorting arrays": { green: 0.5, yellow: 2 },
  "Proving NP==P": { green: 4141, yellow: 6000 },
  "Standing out": { green: 0.300, yellow: 0.330 },
};

const indicators: BenchIndicator[] = [
  { benches: /NP/, modFn: () => colors.magenta("%") },
  { benches: /array/, modFn: () => "🎹" },
  {
    benches: /Standing/,
    modFn: () => "🚀",
    color: colors.magenta,
  },
];

runBenchmarks(
  { silent: true, skip: /_long/ },
)
  .then(prettyBenchmarkDown(
    console.log,
    {
      title: "An example benchMarkdown",
      description: (runResult: BenchmarkRunResult) =>
        `This markdown was generated with the use of \`prettyBenchmarkDown\`.\nIf you use a function for the \`description\` or \`afterTables\`, you can process the results here as well: \n\n > In this benchmark ${runResult.results.length} benches were run, ${runResult.filtered} were filtered.`,
      afterTables:
        "\n---\n\nThis is the `afterTables`. This behaves the same as \`description\`, it just puts this at the bottom of the markdown.\nHere its defined with a simple string.\n\nCheck out the Github Action, which comments a markdown like this on PRs: $link",
      groups: [
        {
          include: /array/,
          name: "Default columns and dynamic text",
          description:
            "This is a group's \`description\`.\nHere you can see what the default columns are, and how you can use a `function` as `description` or `afterTable` inside a group",
          afterTable: (
            gr: BenchmarkResult[],
            g: GroupDefinition,
            rr: BenchmarkRunResult,
          ) =>
            `This is a group's \`afterTable\`.\nHere you can access eg. the group name: \`${g.name}\`, benchmarks in this group: \`${gr.length}\` of them here, or the whole \`BenchmarkRunResult\`: \`${rr.results.length}\` benchmarks total`,
          columns: [...defaultColumns()],
        },
        {
          include: /array/,
          name: "Custom columns",
          afterTable:
            "If you see `-`, that means the value there was `undefined`, if you see `*` it means that column is badly configured, no `formatter` or `propertyKey` was defined.",
          columns: [
            ...defaultColumns(["name", "runsCount", "totalMs"]),
            {
              title: "CustomTotal",
              propertyKey: "totalMs",
              toFixed: 5,
              align: "left",
            },
            {
              title: "Formatter",
              formatter: (r: BenchmarkResult, cd: ColumnDefinition) =>
                `${r.name.split("").reverse().join("")}:${
                  cd.title.split("").reverse().join("")
                } <-`,
            },
            {
              title: "Undefined",
              propertyKey: "dontHaveOneLikeThis",
            },
            {
              title: "Bad Config",
            },
          ],
        },
        {
          include: /otating|Proving|Standing/,
          name: "Predefiend columns",
          description:
            "Here you can see, what the predefined columns are.\n\nYou can add the `indicators` and `thresholds` that you use in `prettyBenchmarkProgress` and `prettyBenchmarkResults`.\n\nYou can see, how you can rename columns like with `Thresholds+`",
          columns: [
            indicatorColumn(indicators),
            ...defaultColumns(),
            thresholdsColumn(thresholds),
            { ...thresholdsColumn(thresholds, true), title: "Thresholds+" },
            thresholdResultColumn(thresholds),
          ],
        },
        {
          include: /i/,
          name: "Extra metrics",
          description:
            "You can add `extraMetrics` columns too. In its `metrics` array you can define which columns you want. If you set `ignoreSingleRuns` to `true`, it wont show values on rows, where runCount is 1.",
          columns: [
            ...defaultColumns(),
            ...extraMetricsColumns({ ignoreSingleRuns: true }),
          ],
        },
      ],
    },
  ));
