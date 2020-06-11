import { prettyBenchmarkProgress, prettyBenchmarkResult } from "./mod.ts";
import {writeJsonSync, writeFileStrSync, readJsonSync } from "https://deno.land/std@0.56.0/fs/mod.ts";

import { bench, runBenchmarks, BenchmarkRunProgress, ProgressState} from "./deps.ts";

const progressData: any[] = readJsonSync("./docs/benchmark_progress_inputs.json") as any;
const resultData = readJsonSync("./docs/benchmark_result_input.json");

progressData.forEach(pd => {
    prettyBenchmarkProgress()(pd);
});


let prog = "";

prettyBenchmarkResult({outputFn: str => prog+= (str || "") + "\n"})(resultData as any);

console.log(prog);

writeFileStrSync("./docs/showcase.txt", prog);