import {
  BenchIndicator,
  prettyBenchmarkHistory,
  prettyBenchmarkProgress,
  prettyBenchmarkResult,
} from "https://deno.land/x/pretty_benching@v0.3.1/mod.ts";

import {
  bench,
  runBenchmarks,
} from "https://deno.land/std@0.82.0/testing/bench.ts";

import * as colors from "https://deno.land/std@0.82.0/fmt/colors.ts";
import {
  deltaProgressRowExtra,
  deltaResultInfoCell,
} from "./history_extensions.ts";

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

const historicData =
  '{"history":[{"date":"2020-09-18T10:43:57.695Z","benchmarks":{"Sorting arrays":{"measuredRunsAvgMs":0.4617750250000041,"runsCount":4000,"totalMs":1847.1001000000165},"Rotating arrays":{"measuredRunsAvgMs":2.2363983999999726,"runsCount":1000,"totalMs":2236.3983999999728},"Proving NP==P":{"measuredRunsAvgMs":5763.3927,"runsCount":1,"totalMs":5763.3927}}}]}';
const history = new prettyBenchmarkHistory(JSON.parse(historicData));

const thresholds = {
  "Rotating arrays": { green: 2.5, yellow: 3.4 },
  "Proving NP==P": { green: 4600, yellow: 5500 },
};

const indicators: BenchIndicator[] = [
  {
    benches: /Rotating arrays/,
    modFn: () => "🚀",
  },
  { benches: /NP/, modFn: colors.yellow, color: colors.blue },
  {
    benches: /Standing/,
    modFn: () => colors.bgRed("%"),
    color: colors.magenta,
  },
];

runBenchmarks(
  { silent: true, skip: /_long/ },
  prettyBenchmarkProgress(
    {
      indicators,
      thresholds,
      rowExtras: deltaProgressRowExtra(history),
    },
  ),
).then(
  prettyBenchmarkResult(
    {
      thresholds,
      indicators,
      infoCell: deltaResultInfoCell(history),
      parts: {
        extraMetrics: true,
        threshold: true,
        graph: true,
        graphBars: 5,
      },
    },
  ),
);
