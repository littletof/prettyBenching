import { prettyBenchmarkProgress, prettyBenchmarkResult } from "../mod.ts";
import {
  bench,
  runBenchmarks,
  clearBenchmarks,
  colors,
  BenchmarkResult,
  BenchmarkRunResult,
  BenchmarkRunProgress,
} from "../deps.ts";
import { test } from "./test_deps.ts";
import {
  prettyBenchmarkDown,
  GroupDefinition,
} from "../pretty_benchmark_down.ts";

import { Thresholds, BenchIndicator } from "../types.ts";

import { benchmark_progress, benchmark_result } from "./test_data.ts";

const thresholds: Thresholds = {
  "Sorting arrays": { green: 0.60, yellow: 1 },
  "Rotating arrays": { green: 1.85, yellow: 2 },
  "Standing out": { green: 0.5, yellow: 0.74 },
};

test({
  name: "commandlineBenching",
  fn: async function (): Promise<void> {
    const progressFn = prettyBenchmarkProgress({ thresholds });
    const resultFn = prettyBenchmarkResult({ thresholds });

    benchmark_progress.forEach((p) => progressFn(p as BenchmarkRunProgress));
    resultFn(benchmark_result);
  },
});

test({
  name: "without options",
  fn: async function (): Promise<void> {
    const progressFn = prettyBenchmarkProgress();
    const resultFn = prettyBenchmarkResult();

    benchmark_progress.forEach((p) => progressFn(p as BenchmarkRunProgress));
    resultFn(benchmark_result);
  },
});

test({
  name: "nocolor",
  fn: async function (): Promise<void> {
    const progressFn = prettyBenchmarkProgress({ nocolor: true });
    const resultFn = prettyBenchmarkResult({ nocolor: true });

    benchmark_progress.forEach((p) => progressFn(p as BenchmarkRunProgress));
    resultFn(benchmark_result);
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
      .then(prettyBenchmarkDown(() => {/* do not print */}, {
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
