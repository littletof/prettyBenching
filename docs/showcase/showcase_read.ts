// deno-lint-ignore-file

import { prettyBenchmarkProgress, prettyBenchmarkResult } from "../../mod.ts";
import {
  writeJsonSync,
  writeFileStrSync,
  readJsonSync,
} from "https://deno.land/std@0.57.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.57.0/path/mod.ts";
import { BenchmarkRunProgress, ProgressState } from "https://deno.land/std@0.57.0/testing/bench.ts";

const pathBase = join(".", "docs", "showcase");

const progressData: any[] = readJsonSync(
  join(pathBase, "benchmark_progress_inputs.json"),
) as any;
const resultData = readJsonSync(join(pathBase, "benchmark_result_input.json"));

const nocolor = true;
const pg = prettyBenchmarkProgress({nocolor});

const fid = await Deno.open(join(pathBase, "showcase.txt"), {create: true, write: true});
const originalSTD = Deno.stdout.writeSync;
const originalLog = globalThis.console.log;

globalThis.console.log = (...args: unknown[]) => Deno.writeSync(fid.rid, new TextEncoder().encode(`${args[0] || "\n"}`))

Deno.stdout.writeSync = (p: Uint8Array): number => { Deno.writeSync(fid.rid, p); return 0;};
progressData.forEach((pd: BenchmarkRunProgress) => {

  // pg(pd);
  if(
    (pd.state === ProgressState.BenchmarkingStart || pd.state === ProgressState.BenchmarkingEnd)
    || (pd.state === ProgressState.BenchResult && [...pd.results].reverse()[0].name == "finished")
    || (pd.state === ProgressState.BenchStart && pd.running?.name == "benchmark-start")
    || (pd.state === ProgressState.BenchPartialResult && pd.running?.measuredRunsMs.length == 52 && pd.running?.name == "multiple-runs")
  ){
    pg(pd);
  } else {
    if(pd.state === ProgressState.BenchPartialResult ){
      // Deno.stdout.writeSync(new TextEncoder().encode("\r"));
    }
    if(pd.state === ProgressState.BenchResult && [...pd.results].reverse()[0].name != "benchmark-start"){
      Deno.stdout.writeSync(new TextEncoder().encode("\n"));
    }
  }

});

let resultLog: string = "";
const resultFn = prettyBenchmarkResult({ nocolor: true, outputFn: (log?: string) => resultLog = log!});
resultFn(resultData as any);

// writeFileStrSync(join(pathBase, "showcase.txt"), resultLog);
console.log(`\n${"-".repeat(60)}${"-".repeat(60)}\n\n`);

console.log(resultLog);

fid.close();