// deno-lint-ignore-file

import { prettyBenchmarkProgress, prettyBenchmarkResult } from "../../mod.ts";
import {
  writeJsonSync,
  writeFileStrSync,
} from "https://deno.land/std@0.57.0/fs/mod.ts";

import {
  bench,
  runBenchmarks,
  BenchmarkRunProgress,
  ProgressState,
} from "../../deps.ts";

bench({
  name: "finished",
  runs: 100,
  func(b): void {
    b.start();
    for (let i = 0; i < 1e6; i++);
    b.stop();
  },
});

bench({
  name: "benchmark-start",
  runs: 1,
  func(b): void {
    b.start();
    for (let i = 0; i < 1e6; i++);
    b.stop();
  },
});

bench({
  name: "multiple-runs",
  runs: 100,
  func(b): void {
    b.start();
    for (let i = 0; i < 1e8; i++);
    b.stop();
  },
});

const progress: any[] = [];

runBenchmarks({ silent: true }, (progress) => {
  prettyBenchmarkProgress()(progress), write(progress);
}).then((x) => saveresult(x))
  .catch(
    (e) => {
      console.error(e);
    },
  );

function saveresult(result: any) {
  writeFileStrSync(
    "./docs/showcase/benchmark_progress_inputs.json",
    prettyJSON(progress),
  );
  writeFileStrSync(
    "./docs/showcase/benchmark_result_input.json",
    prettyJSON(result),
  );
}

function write(prog: BenchmarkRunProgress) {
  progress.push(prog);
}

function prettyJSON(obj: any) {
  if (typeof obj === "string") {
    obj = JSON.parse(obj);
  }
  const output = JSON.stringify(obj, function (k, v) {
    if (k === "measuredRunsMs" && v instanceof Array) {
      return JSON.stringify(v);
    }
    return v;
  }, 2)
    .replace(/\"\[/g, "[")
    .replace(/\]\"/g, "]")
    .replace(/\"\{/g, "{")
    .replace(/\}\"/g, "}");

  return output;
}
