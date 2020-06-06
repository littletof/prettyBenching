import {
  BenchmarkRunResult,
  BenchmarkResult,
  colors,
} from "./deps.ts";
let { cyan, green, yellow, gray, red, blue, setColorEnabled } = colors;

import { getTimeColor, padEndVisible, padStartVisible, num, perc } from "./utils.ts";

export interface prettyBenchmarkResultOptions {
  precision?: number;
  threshold?: any;
  outputFn?: (log?: string) => any;
  nocolor?: boolean;
}

interface ResultOptions {
  precision: number;
  threshold?: any;
  outputFn: (log?: string) => any;
}

export function prettyBenchmarkResult(
  { precision = 10, threshold, outputFn = console.log, nocolor }:
    prettyBenchmarkResultOptions = { precision: 10, outputFn: console.log },
) {

  // if(nocolor) { setColorEnabled(false); }

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
    padEndVisible(`${green("|")}    ${`Benchmark name: ${cyan(name)}`}`, padLength()+1) + `${green("|")}`,
  );
  options.outputFn(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkSingleRunMetrics(
  result: BenchmarkResult,
  options: ResultOptions,
) {
  const totalRuns = `Total runs: ${yellow("1".padEnd(7))}`;
  const totalMS = `Total time: ${
    padEndVisible(`${yellow(num(result.totalMs))} ms`, 16)
  }`;
  const metrics = `${totalRuns}${green("|")}  ${totalMS}${green("|")}`;

  options.outputFn(
    padEndVisible(`${green("|")}    ${metrics}`, padLength()+1) + `${green("|")}`
  );
  options.outputFn(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkMultipleRunMetrics(
  result: BenchmarkResult,
  options: ResultOptions,
) {
  const totalRuns = `Total runs: ${
    // yellow(result.runsCount.toString().padEnd(7)) TODO in later std versions
    padEndVisible(yellow((result.runsCount || 1).toString()), 7)
  }`;
  const totalMS = `Total time: ${
    padEndVisible(`${yellow(num(result.totalMs))} ms`, 16)
  }`;
  const avgRun = `Avg time: ${
    padEndVisible(`${yellow(num(result.measuredRunsAvgMs!))} ms`, 8)
  }`;
  const metrics = `${totalRuns}${green("|")}  ${totalMS}${green("|")}   ${avgRun}`;

  options.outputFn(
    padEndVisible(`${green("|")}    ${metrics}`, padLength()+1) + `${green("|")}`,
  );
  options.outputFn(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkMultipleRunBody(
  result: BenchmarkResult,
  options: ResultOptions,
) {
  //console.log(JSON.stringify(result.measuredRunsMs?.sort())); // TODO fix grouping
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
    const rp = r / result.runsCount! * 100;
    if (rMax > 61) {
      rc = Math.ceil(rp / 100 * 61);
    }

    const groupHead = min + i * unit; // TODO Handle precision. if eg. bigger then 100, only fixed 2/3
    const bar = Array(rc).fill("=").join("");

    const colorFn = getTimeColor(result.name, groupHead, options.threshold);

    const fullBar = colorFn(bar);

    const count = r.toString().padStart(6);
    const percent = perc(rp).padStart(4) + "%";

    options.outputFn(
      padEndVisible(`${cyan("|")} ${padEndVisible(`${num(groupHead, true)} ms`, Math.max(num(max).length, 6))} _[${count}][${percent}] ${cyan("|")} ${fullBar}`, padLength()+1) + `${cyan("|")}`,
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
