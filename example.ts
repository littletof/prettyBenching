import {
  prettyBenchmarkProgress,
  prettyBenchmarkResult,
  prettyBenchmarkDown,
  defaultColumns,
  indicatorColumn,
  thresholdResultColumn,
  thresholdsColumn,
  ColumnDefinition,
  extraMetricsColumns,
  GroupDefinition,
} from "https://deno.land/x/pretty_benching@v0.2.2/mod.ts";

import {
  runBenchmarks,
  bench,
} from "https://deno.land/std@0.66.0/testing/bench.ts";

import * as colors from "https://deno.land/std@0.66.0/fmt/colors.ts";

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
).then(
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
);
