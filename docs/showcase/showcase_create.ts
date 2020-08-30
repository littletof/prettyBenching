// deno-lint-ignore-file

import { prettyBenchmarkProgress } from "../../mod.ts";

import {
  bench,
  runBenchmarks,
  BenchmarkRunProgress,
} from "../../deps.ts";

bench({
  name: "Sorting arrays",
  runs: 200,
  func(b): void {
    b.start();
    new Array(10000).fill(Math.random()).sort();
    b.stop();
  },
});

bench({
  name: "Rotating arrays",
  runs: 20,
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
  name: "Standing out",
  runs: 20,
  func(b): void {
    b.start();
    new Array(10000).fill(Math.random()).sort();
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
  Deno.writeTextFileSync(
    "./docs/showcase/benchmark_progress_inputs.json",
    prettyJSON(progress),
  );
  Deno.writeTextFileSync(
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
