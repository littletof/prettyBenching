import { prettyBenchmarkProgress, prettyBenchmarkResult } from "../mod.ts";
import {writeJsonSync, writeFileStrSync } from "https://deno.land/std@0.56.0/fs/mod.ts";

import { bench, runBenchmarks, BenchmarkRunProgress, ProgressState} from "../deps.ts";



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
    name: "for100ForIncrementX1e8_long",
    runs: 100,
    func(b): void {
      b.start();
      for (let i = 0; i < 1e8; i++);
      b.stop();
    },
  });

  const progress: any[] = [];

  runBenchmarks({ silent: true },
    (progress) => {prettyBenchmarkProgress()(progress), write(progress)},
  ) //.then(console.log);
    // .then(prettyBenchmarkResult({ precision: 5 }))
    .then(x => saveresult(x))
    .catch(
      (e: any) => {
        // console.log(red(e.benchmarkName));
        // console.error(colors.red(e.stack));
      },
    );

function saveresult(result: any) {
    writeJsonSync("./docs/benchmark_result_input.json", result, { spaces: 2 });
}

function write(prog: BenchmarkRunProgress) {
    if(
        prog.state === ProgressState.BenchmarkingStart
        || prog.state === ProgressState.BenchmarkingEnd
        || (prog.state === ProgressState.BenchResult && prog.results.length != 3)
        || (prog.state === ProgressState.BenchStart && prog.running?.name === "for100ForIncrementX1e6")
        || (prog.state === ProgressState.BenchPartialResult && prog.running?.name === "for100ForIncrementX1e8_long" && prog.running.measuredRunsMs.length == 52)
    ) {
        progress.push(prog);
        writeJsonSync("./docs/benchmark_progress_inputs.json", progress, { spaces: 2 });
    }
}
// writeJsonSync(options.json_path, benchmarkResults, { spaces: 2 });