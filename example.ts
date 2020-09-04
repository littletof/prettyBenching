import {
  prettyBenchmarkProgress,
  prettyBenchmarkResult,
  BenchIndicator,

import {
  runBenchmarks,
  bench,
} from "https://deno.land/std@0.67.0/testing/bench.ts";

import * as colors from "https://deno.land/std@0.67.0/fmt/colors.ts";

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

const indicators: BenchIndicator[] = [
  { benches: /NP/, modFn: colors.white, color: colors.blue },
  {
    benches: /Standing/,
    modFn: () => colors.bgRed("%"),
    color: colors.magenta,
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
