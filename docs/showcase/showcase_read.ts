// deno-lint-ignore-file

import { prettyBenchmarkProgress, prettyBenchmarkResult } from "../../mod.ts";
import { join } from "https://deno.land/std@0.91.0/path/mod.ts";
import {
  BenchmarkRunProgress,
  ProgressState,
} from "https://deno.land/std@0.91.0/testing/bench.ts";

const pathBase = join(".", "docs", "showcase");

await Deno.permissions.request({name: 'hrtime'});
const readResult = await Deno.permissions.request({name: 'read', path: pathBase});
if(readResult.state !== 'granted') {
  console.error('Can\'t run without input data for the benchmark. Exiting...');
  Deno.exit(1);
}
const writeResult = await Deno.permissions.request({name: 'write', path: pathBase});
if(writeResult.state !== 'granted') {
  console.error('Can\'t save result without write permission. Exiting...');
  Deno.exit(1);
}

const progressData: any[] = readJsonSync(
  join(pathBase, "benchmark_progress_inputs.json"),
) as any;
const resultData = readJsonSync(join(pathBase, "benchmark_result_input.json"));

const nocolor = true;

const fid = await Deno.open(
  join(pathBase, "showcase.txt"),
  { create: true, write: true },
);

const pg = prettyBenchmarkProgress({
  nocolor,
  thresholds: { "multiple-runs": { green: 76, yellow: 82 } },
  indicators: [{ benches: /multiple-runs/, modFn: (str) => "%" }],
  outputFn: (str: string) =>
    Deno.writeSync(fid.rid, new TextEncoder().encode(`${str}\n`)),
});

const originalSTD = Deno.stdout.writeSync;
const originalLog = globalThis.console.log;

/*globalThis.console.log = (...args: unknown[]) =>
  Deno.writeSync(fid.rid, new TextEncoder().encode(`${args[0] ? args[0] + "\n" : "\n"}`));

Deno.stdout.writeSync = (p: Uint8Array): number => {
  Deno.writeSync(fid.rid, p);
  return 0;
};*/

progressData.forEach((pd: BenchmarkRunProgress) => {
  if (
    (pd.state === ProgressState.BenchmarkingStart ||
      pd.state === ProgressState.BenchmarkingEnd) ||
    (pd.state === ProgressState.BenchResult &&
      [...pd.results].reverse()[0].name == "finished") ||
    (pd.state === ProgressState.BenchStart &&
      pd.running?.name == "benchmark-start") ||
    (pd.state === ProgressState.BenchPartialResult &&
      pd.running?.measuredRunsMs.length == 52 &&
      pd.running?.name == "multiple-runs")
  ) {
    pg(pd);
  } else {
    if (
      pd.state === ProgressState.BenchResult &&
      [...pd.results].reverse()[0].name != "benchmark-start"
    ) {
      // Deno.stdout.writeSync(new TextEncoder().encode("\n"));
    }
  }
});

let resultLog: string = "";
const resultFn = prettyBenchmarkResult(
  {
    nocolor: true,
    outputFn: (log?: string) => resultLog = log!,
    thresholds: { "multiple-runs": { green: 76, yellow: 82 } },
    indicators: [{ benches: /multiple-runs/, modFn: (str) => "%" }],
    parts: { extraMetrics: true, graphBars: 5, graph: true, threshold: true },
  },
);
resultFn(resultData as any);

Deno.writeSync(
  fid.rid,
  new TextEncoder().encode(`${"-".repeat(60)}${"-".repeat(60)}\n\n`),
); // separator line

Deno.writeSync(fid.rid, new TextEncoder().encode(`${resultLog}`));

fid.close();

function readJsonSync(path: string) {
  return JSON.parse(Deno.readTextFileSync(path));
}
