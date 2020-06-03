import {
  BenchmarkRunResult,
  BenchmarkResult,
  cyan,
  green,
  yellow,
  gray,
  red,
} from "./deps.ts";

import { getTimeColor } from "./utils.ts";

export function prettyBenchmarkResult(
  { precision = 10, threshold }: { precision?: number; threshold?: any } = {},
) {
  return (result: BenchmarkRunResult) =>
    _prettyBenchmarkResult(result, { precision, threshold });
}

function _prettyBenchmarkResult(
  results: BenchmarkRunResult,
  options: any,
): BenchmarkRunResult {
  results.results.forEach((r) => {
    prettyBenchmarkHeader(r.name);

    if (!r.runsCount) {
      prettyBenchmarkSingleRunMetrics(r);
    } else {
      prettyBenchmarkMultipleRunMetrics(r);
      prettyBenchmarkMultipleRunBody(r, options);
    }
  });

  return results;
}

function prettyBenchmarkHeader(name: string) {
  console.log(green(prettyBenchmarkSeparator()));
  console.log(
    `${green("|")}    ${
      `Benchmark name: ${cyan(name)}`.padEnd(padLength() + 6)
    }${green("|")}`,
  );
  console.log(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkSingleRunMetrics(result: BenchmarkResult) {
  const totalRuns = `Total runs: ${yellow("1".padEnd(7))}`;
  const totalMS = `Total run time: ${
    `${yellow(result.totalMs.toFixed(4))} ms`.padEnd(10 + 3 + 10)
  }`;
  const metrics = `${totalRuns}${green("|")}  ${totalMS}${green("|")}`;

  console.log(
    `${green("|")}    ${metrics.padEnd(padLength() + 40 - 4)}${green("|")}`,
  );
  console.log(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkMultipleRunMetrics(result: BenchmarkResult) {
  const totalRuns = `Total runs: ${
    yellow(result.runsCount!.toString().padEnd(7))
  }`;
  const totalMS = `Total run time: ${
    `${yellow(result.totalMs.toFixed(4))} ms`.padEnd(10 + 3 + 10)
  }`;
  const avgRun = `Average run time: ${
    `${yellow(result.measuredRunsAvgMs!.toFixed(4))} ms`.padEnd(8 + 3 + 10)
  }`;
  const metrics = `${totalRuns}${green("|")}  ${totalMS}${
    green("|")
  }   ${avgRun}`;

  console.log(
    `${green("|")}    ${metrics.padEnd(padLength() + 50 - 4)}${green("|")}`,
  );
  console.log(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkMultipleRunBody(
  result: BenchmarkResult,
  options?: any,
) {
  const max = Math.max(...result.measuredRunsMs!);
  const min = Math.min(...result.measuredRunsMs!);
  const unit = (max - min) / options.precision;
  let r = result.measuredRunsMs!.reduce((prev, runMs, i, a) => {
    // console.log(min, max, unit, runMs, ((runMs-min)/unit), ((runMs-min)/unit)*10, Math.ceil(((runMs-min)/unit)));
    prev[Math.min(Math.ceil(((runMs - min) / unit)), options.precision - 1)]++;

    return prev;
  }, new Array(options.precision).fill(0));

  // console.log(min, max, unit, r);

  console.log(`${cyan("|")}${"".padEnd(padLength())}${cyan("|")}`);

  /* r = r.map((v, i) => 72+Math.ceil(Math.random()*50*i*i));
      result.runsCount = r.reduce((pv, n) => pv+n);
      console.log(r, result.runsCount);*/

  const rMax = Math.max(...r);
  r.forEach((r: number, i: number) => {
    let rc = r;
    const rp = Math.round(r / result.runsCount! * 100);
    if (rMax > 72) {
      rc = Math.ceil(rp / 100 * 72);
    }

    const groupHead = Math.trunc(min + i * unit);
    const bar = Array(rc).fill("=").join("").padEnd(padLength() - 26);

    const colorFn = getTimeColor(result.name, groupHead, options.threshold);

    const fullBar = colorFn(bar);

    const count = r.toString().padStart(5);
    const percent = rp.toString().padStart(3) + "%";

    console.log(
      `${cyan("|")} ${
        `${groupHead} ms`.padEnd(Math.max(max.toString().length, 5 + 3))
      } [${count}][${percent}] ${cyan("|")} ${fullBar}${cyan("|")}`,
    );
  });

  console.log(`${cyan("|")}${"".padEnd(padLength())}${cyan("|")}`);
  console.log(`${cyan(prettyBenchmarkSeparator())}`);
  console.log();
}

function prettyBenchmarkSeparator() {
  return `+-------------------------------------------------------------------------------------------+`;
}

function padLength() {
  return prettyBenchmarkSeparator().length - 2;
}
