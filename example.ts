import {
  prettyBenchmarkProgress,
  prettyBenchmarkResult,
} from "https://deno.land/x/pretty_benching@v0.1.2/mod.ts";

import {
  runBenchmarks,
  bench,
  BenchmarkResult,
} from "https://deno.land/std@0.61.0/testing/bench.ts";

import * as colors from "https://deno.land/std@0.61.0/fmt/colors.ts";

// TODO fix import
import {
  prettyBenchmarkDown,
  defaultColumns,
  indicatorColumn,
  thresholdResultColumn,
  thresholdsColumn,
  ColumnDefinition,
} from "./pretty_benchmark_down.ts";

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
    let a = new Array();
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

const thresholds = {
  "Rotating arrays": { green: 2.5, yellow: 3.4 },
};

const indicators = [
  { benches: /NP/, modFn: colors.white, tableColor: colors.blue },
  {
    benches: /Standing/,
    modFn: () => colors.bgRed("%"),
    tableColor: colors.magenta,
  },
];

runBenchmarks(
  { silent: true, skip: /_long/ },
  prettyBenchmarkProgress({ indicators, thresholds }),
)
  /* .then(
    prettyBenchmarkResult(
      {
        thresholds,
        indicators,
        parts: {
          extraMetrics: true,
          threshold: true,
          graph: true,
          graphBars: 5,
        },
      },
    ),
  );*/
  // .then(prettyBenchmarkDown({title: 'test', description:'Idontknow but anything goes here', footer:'Summa summárum', output: console.log, groups: [{include: /arrays/, name: 'Arrays', description: 'ez array műveletes'}, {include: /[sS]/, name: 'S', description: 'SSSS'}]}));
  .then(prettyBenchmarkDown(console.log, {
    title: "MY example benchMarkdown",
    description: "long text",
    afterTables: "---\n This can be a footer or something else",
    columns: [
      indicatorColumn(indicators),
      ...defaultColumns,
      thresholdResultColumn(thresholds),
      thresholdsColumn(thresholds),
      thresholdsColumn(thresholds, true),
      { title: "test", propertyKey: "runsCount" },
      { title: "noproperty" },
      { title: "undefined", propertyKey: "ilyennincs" },
      {
        title: "format",
        toFixed: 3,
        formatter: (result: BenchmarkResult, cd: ColumnDefinition) => {
          return result.measuredRunsAvgMs.toFixed(cd.toFixed) + "bambamarha";
        },
      },
      // {title: 'tresholds', toFixed: 3, formatter: (result: BenchmarkResult, cd: any) => { return '<small><= 123 ✅<br/><= 654 🔶<br/> > 654 🔴</small>'; }, align: "right"},
      // {title: 'historic', toFixed: 3, formatter: (result: BenchmarkResult, cd: any) => { return Math.random() > 0.5 ? `+10% 🔼`:' -5% 🔰'; }, align: "right"}
    ],
  }));
