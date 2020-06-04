import { prettyBenchmarkProgress, prettyBenchmarkResult } from "./mod.ts";
import { red, bench, runBenchmarks } from "./deps.ts";
import { test, assert } from "./test_deps.ts";

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

const threshold = {
  "for100ForIncrementX1e6": { green: 0.85, yellow: 1 },
  "for100ForIncrementX1e8": { green: 84, yellow: 93 },
  "forIncrementX1e9": { green: 900, yellow: 800 },
  "forIncrementX1e9x2": { green: 15000, yellow: 18000 },
  multiple: { green: 0.019, yellow: 0.025 },
};

test({
  name: "commandlineBenching",
  fn: async function (): Promise<void> {
    runBenchmarks({ silent: true }, prettyBenchmarkProgress({ threshold }))
      .then(prettyBenchmarkResult({ precision: 5, threshold })).catch(
        (e: any) => {
          // console.log(red(e.benchmarkName));
          console.error(red(e.stack));
        },
      );
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
