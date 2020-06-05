import {
  BenchmarkRunResult,
  BenchmarkResult,
colors
} from "./deps.ts";
const { cyan, green, yellow, gray, red } = colors;

import { getTimeColor } from "./utils.ts";

export interface prettyBenchmarkResultOptions {
  precision?: number;
  threshold?: any;
  outputFn?: (log?: string) => void;
}

interface ResultOptions {
  precision: number;
  threshold?: any;
  outputFn: (log?: string) => void;
}

export function prettyBenchmarkResult(
  { precision = 10, threshold, outputFn = console.log}: prettyBenchmarkResultOptions = { precision: 10, outputFn: console.log },
) {
  return (result: BenchmarkRunResult) =>
    _prettyBenchmarkResult(result, { precision, threshold, outputFn });
}

function _prettyBenchmarkResult(
  results: BenchmarkRunResult,
  options: ResultOptions,
): BenchmarkRunResult {
  results.results.forEach((r) => {
    prettyBenchmarkHeader(r.name, options);
    if (r.runsCount == 1 || !r.runsCount) { // TODO runsCount will be always present
      prettyBenchmarkSingleRunMetrics(r, options);
    } else {
      prettyBenchmarkMultipleRunMetrics(r, options);
      prettyBenchmarkMultipleRunBody(r, options);
    }
  });

  return results;
}

function prettyBenchmarkHeader(name: string, options: ResultOptions) {
  options.outputFn(green(prettyBenchmarkSeparator()));
  options.outputFn(
    `${green("|")}    ${
      `Benchmark name: ${cyan(name)}`.padEnd(padLength() + 6)
    }${green("|")}`,
  );
  options.outputFn(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkSingleRunMetrics(result: BenchmarkResult, options: ResultOptions) {
  const totalRuns = `Total runs: ${yellow("1".padEnd(7))}`;
  const totalMS = `Total run time: ${
    `${yellow(result.totalMs.toFixed(4))} ms`.padEnd(10 + 3 + 10)
  }`;
  const metrics = `${totalRuns}${green("|")}  ${totalMS}${green("|")}`;

  options.outputFn(
    `${green("|")}    ${metrics.padEnd(padLength() + 40 - 4)}${green("|")}`,
  );
  options.outputFn(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkMultipleRunMetrics(result: BenchmarkResult, options: ResultOptions) {
  const totalRuns = `Total runs: ${
    // yellow(result.runsCount.toString().padEnd(7)) TODO in later std versions
    yellow((result.runsCount || 1).toString().padEnd(7))
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

  options.outputFn(
    `${green("|")}    ${metrics.padEnd(padLength() + 50 - 4)}${green("|")}`,
  );
  options.outputFn(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkMultipleRunBody(
  result: BenchmarkResult,
  options: ResultOptions
) {
  const max = Math.max(...result.measuredRunsMs!);
  const min = Math.min(...result.measuredRunsMs!);
  const unit = (max - min) / options.precision!;
  let r = result.measuredRunsMs!.reduce((prev, runMs, i, a) => { // TODO !
    // console.log(min, max, unit, runMs, ((runMs-min)/unit), ((runMs-min)/unit)*10, Math.ceil(((runMs-min)/unit)));
    prev[Math.min(Math.ceil(((runMs - min) / unit)), options.precision - 1)]++;

    return prev;
  }, new Array(options.precision).fill(0));

  // console.log(min, max, unit, r);

  options.outputFn(`${cyan("|")}${"".padEnd(padLength())}${cyan("|")}`);

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

    options.outputFn(
      `${cyan("|")} ${
        `${groupHead} ms`.padEnd(Math.max(max.toString().length, 5 + 3))
      } [${count}][${percent}] ${cyan("|")} ${fullBar}${cyan("|")}`,
    );
  });

  options.outputFn(`${cyan("|")}${"".padEnd(padLength())}${cyan("|")}`);
  options.outputFn(`${cyan(prettyBenchmarkSeparator())}`);
  options.outputFn();
}

function prettyBenchmarkSeparator() {
  return `+-------------------------------------------------------------------------------------------+`;
}

function padLength() {
  return prettyBenchmarkSeparator().length - 2;
}
