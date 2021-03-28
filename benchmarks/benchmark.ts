// deno-lint-ignore-file

import {
  bench,
  runBenchmarks,
} from "https://deno.land/std@0.91.0/testing/bench.ts";
import { join } from "https://deno.land/std@0.91.0/path/mod.ts";
import { prettyBenchmarkResult } from "../mod.ts";
import { colors } from "../deps.ts";

console.log(
  new URL(
    join("..", "docs", "showcase", "benchmark_result_input.json"),
    import.meta.url,
  ).href,
);

await Deno.permissions.request({ name: "hrtime" });

const inputJSONPath = join("docs", "showcase", "benchmark_result_input.json");
const result = await Deno.permissions.request({
  name: "read",
  path: inputJSONPath,
});
if (result.state !== "granted") {
  console.error(
    colors.red("Can't run without input data for the benchmark. Exiting..."),
  );
  Deno.exit(1);
}

const data = JSON.parse(Deno.readTextFileSync(inputJSONPath));

const resultFn = prettyBenchmarkResult(
  {
    nocolor: false,
    thresholds: {
      "multiple-runs": { green: 76, yellow: 82 },
      "benchmark-start": { green: 2, yellow: 3 },
    },
    indicators: [
      {
        benches: /multiple-runs/,
        color: colors.magenta,
        modFn: (str) => "🚀",
      },
    ],
    parts: { threshold: true, extraMetrics: true, graph: true },
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
