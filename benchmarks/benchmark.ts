import {
  bench,
  runBenchmarks,
} from "https://deno.land/std@0.57.0/testing/bench.ts";
import { readJsonSync } from "https://deno.land/std@0.57.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.57.0/path/mod.ts";
import { prettyBenchmarkResult } from "../mod.ts";
import { TableBuilder } from "../table.ts";
import { colors } from "../deps.ts";

console.log(
  new URL(
    join("..", "docs", "showcase", "benchmark_result_input.json"),
    import.meta.url,
  ).href,
);
const data = readJsonSync(
  join("docs", "showcase", "benchmark_result_input.json"),
);

const thres = {
  "multiple-runs": { green: 76, yellow: 82 },
};
const resultFn = prettyBenchmarkResult(
  {
    nocolor: false,
    thresholds: thres,
    indicators: [{ benches: /multiple-runs/, tableColor: colors.magenta }],
  },
);

bench({
  name: "benchCard",
  runs: 1,
  func(b) {
    b.start();
    resultFn(data as any);
    b.stop();
  },
});

// current 5.589ms / 1000

await runBenchmarks();
