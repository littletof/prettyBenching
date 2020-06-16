import { prettyBenchmarkProgress, prettyBenchmarkResult } from "./mod.ts";
import { bench, runBenchmarks, colors } from "./deps.ts";

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

bench({
  name: "for100ForIncrementX1e8_long",
  runs: 1000,
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

bench(function forIncrementX1e9x2_long(b): void {
  b.start();
  for (let i = 0; i < 1e9 * 10; i++);
  b.stop();
});

/*bench({
  name: "forIncrementX1e9x3",
  runs: 3,
  func(b): void {
    b.start();
    for (let i = 0; i < 1e9 * 10; i++);
    b.stop();
  }
});*/
// for(let x = 0; x < 5; x++) { const a = performance.now(); for (let i = 0; i < 1e10; i++); console.log(performance.now()-a); }
// for(let x = 0; x < 5; x++) { setTimeout(() => {const a = performance.now(); for (let i = 0; i < 1e10; i++); console.log(performance.now()-a); console.table(Deno.metrics());}, 1000); }

dummyBench("single");
dummyBench("multiple", 2);
dummyBench("custom", 2);
dummyBench("multiple", 1000);
dummyBench("multiple_long", 10000);

const thresholds = {
  "for100ForIncrementX1e6": { green: 0.85, yellow: 1 },
  "for100ForIncrementX1e8": { green: 84, yellow: 93 },
  "forIncrementX1e9": { green: 800, yellow: 900 },
  "forIncrementX1e9x2": { green: 15000, yellow: 18000 },
  multiple: { green: 0.019, yellow: 0.025 },
};

// { benches: /100/, /* modFn: colors.bgRed,  */tableColor: (str: string) => colors.magenta(colors.bgMagenta(str)) },

const indicators = [
  { benches: /100/, modFn: colors.bgRed, tableColor: colors.magenta },
  { benches: /for/, modFn: colors.red },
  {
    benches: /custom|multiple/,
    modFn: () => colors.bgYellow(colors.black("%")),
    tableColor: colors.blue,
  },
  // { benches: /.*/, modFn: () => "#" },
  // { benches: /.*/, modFn: () => colors.bgRed("‼") },
];

runBenchmarks(
  {
    silent: true,
    skip: /_long/,
  },
  prettyBenchmarkProgress({ nocolor: false, indicators, thresholds }),
) //.then(console.log);
  .then(
    prettyBenchmarkResult(
      {
        nocolor: false,
        thresholds,
        indicators,
        parts: {
          extraMetrics: true,
          threshold: true,
          graph: true,
          graphBars: 5,
        },
      },
    ),
  )
  .catch(
    (e) => {
      // console.log(red(e.benchmarkName));
      console.error(colors.red(e.stack));
    },
  );

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
