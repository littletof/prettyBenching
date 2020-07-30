// deno-lint-ignore-file

import {
  bench,
  runBenchmarks,
  BenchmarkRunResult,
  BenchmarkResult,
} from "https://deno.land/std@0.57.0/testing/bench.ts";
import {
  readJsonSync,
  writeFileStrSync,
} from "https://deno.land/std@0.57.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.57.0/path/mod.ts";
import { prettyBenchmarkResult } from "../mod.ts";
import { TableBuilder } from "../table.ts";

console.log(
  new URL(
    join("..", "docs", "showcase", "benchmark_result_input.json"),
    import.meta.url,
  ).href,
);
const data: BenchmarkRunResult = readJsonSync(
  join("docs", "showcase", "benchmark_result_input.json"),
) as any;

const obj: any[] = [];

data.results.forEach((r) => {
  if (r.runsCount == 1) return;
  obj.push(calc(r));
});

writeFileStrSync(
  "./benchmarks/test/test.json",
  prettyJSON(obj),
);

function calc(result: BenchmarkResult) {
  result.measuredRunsMs.sort();
  const prec = 5;
  const max = Math.max(...result.measuredRunsMs);
  const min = Math.min(...result.measuredRunsMs);
  const unit = (max - min) / prec;
  const o = {};
  for (let i = 0; i < prec; i++) {
    (o as any)[i] = [];
    (o as any)[i].push({ group: i * unit + min });
  } /*let r = result.measuredRunsMs.reduce((prev, runMs, i, a) => {
            // console.log(min, max, unit, runMs, ((runMs-min)/unit), ((runMs-min)/unit)*10, Math.ceil(((runMs-min)/unit)));
            prev[Math.min(Math.ceil(((runMs - min) / unit)), prec - 1)]++;

            return prev;
        }, new Array(prec).fill(0))*/

  result.measuredRunsMs.forEach((v) => {
    const i = Math.min(Math.floor(((v - min) / unit)), prec - 1);
    (o as any[][])[i].push(v);
  });
  return o;
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
