import { prettyBenchmarkProgress, prettyBenchmarkResult } from "../mod.ts";
import {
  bench,
  runBenchmarks,
  clearBenchmarks,
  colors,
  BenchmarkResult,
  BenchmarkRunResult,
} from "../deps.ts";
import { test, assert } from "./test_deps.ts";
import {
  prettyBenchmarkDown,
  GroupDefinition,
} from "../pretty_benchmark_down.ts";

// TODO run tests from recorded results.

bench({
  name: "runs100ForIncrementX1e6",
  runs: 100,
  func(b): void {
    b.start();
    for (let i = 0; i < 1e6; i++);
    b.stop();
  },
});

bench({
  name: "for100ForIncrementX1e6",
  runs: 100,
  func(b): void {
    b.start();
    for (let i = 0; i < 1e6; i++);
    b.stop();
  },
});

bench({
  name: "for100ForIncrementX1e8",
  runs: 100,
  func(b): void {
    b.start();
    for (let i = 0; i < 1e8; i++);
    b.stop();
  },
});

bench(function forIncrementX1e9(b): void {
  b.start();
  for (let i = 0; i < 1e9; i++);
  b.stop();
});

bench(function forIncrementX1e9x2(b): void {
  b.start();
  for (let i = 0; i < 1e9 * 10; i++);
  b.stop();
});

dummyBench("single");
dummyBench("multiple", 2);
dummyBench("multiple", 1000);

const thresholds = {
  "for100ForIncrementX1e6": { green: 0.85, yellow: 1 },
  "for100ForIncrementX1e8": { green: 84, yellow: 93 },
  "forIncrementX1e9": { green: 900, yellow: 800 },
  "forIncrementX1e9x2": { green: 15000, yellow: 18000 },
  multiple: { green: 0.019, yellow: 0.025 },
};

test({
  name: "commandlineBenching",
  fn: async function (): Promise<void> {
    runBenchmarks({ silent: true }, prettyBenchmarkProgress({ thresholds }))
      .then(prettyBenchmarkResult({ thresholds })).catch(
        (e) => {
          console.error(colors.red(e.stack));
        },
      );
    assert(true);
  },
});

test({
  name: "without options",
  fn: async function (): Promise<void> {
    runBenchmarks({ silent: true }, prettyBenchmarkProgress())
      .then(prettyBenchmarkResult()).catch(
        (e) => {
          console.error(colors.red(e.stack));
        },
      );
    assert(true);
  },
});

test({
  name: "nocolor",
  fn: async function (): Promise<void> {
    runBenchmarks({ silent: true }, prettyBenchmarkProgress({ nocolor: true }))
      .then(prettyBenchmarkResult({ nocolor: true })).catch(
        (e) => {
          console.error(colors.red(e.stack));
        },
      );
    assert(true);
  },
});

test({
  name: "prettyBenchmarkDown - issue #10 - Empty group results",
  fn: async function (): Promise<void> {
    clearBenchmarks();

    dummyBench("Bench1");
    dummyBench("Bench2");
    dummyBench("Bench3");

    runBenchmarks({ silent: true })
      .then(prettyBenchmarkDown(() => {}, {
        groups: [
          {
            include: /noBenchLikeThis/,
            name: "Fails on v0.2.0",
            description: (
              gr: BenchmarkResult[],
              g: GroupDefinition,
              rr: BenchmarkRunResult,
            ) => `${gr.length}${gr.length}${rr.results.length}`,
          },
        ],
      }));
    assert(true);
  },
});

function dummyBench(name: string, runs = 1): void {
  bench({
    name,
    runs,
    func(b) {
      b.start();
      b.stop();
    },
  });
}
