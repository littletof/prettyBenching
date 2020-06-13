import {
  BenchmarkRunResult,
  BenchmarkResult,
} from "./deps.ts";

import {
  getTimeColor,
  padEndVisible,
  padStartVisible,
  num,
  perc,
} from "./utils.ts";
import { Colorer } from "./colorer.ts";

const c: Colorer = new Colorer();

export interface prettyBenchmarkResultOptions {
  precision?: number;
  threshold?: { [key: string]: { green: number; yellow: number } };
  // deno-lint-ignore no-explicit-any
  outputFn?: (log: string) => any;
  nocolor?: boolean;
}

interface ResultOptions {
  precision: number;
  threshold?: { [key: string]: { green: number; yellow: number } };
  // deno-lint-ignore no-explicit-any
  outputFn: (log: string) => any;
  nocolor: boolean;
}

export function prettyBenchmarkResult(
  { precision = 5, threshold, outputFn = console.log, nocolor = false }:
    prettyBenchmarkResultOptions = { precision: 5, outputFn: console.log },
) {
  return (result: BenchmarkRunResult) =>
    _prettyBenchmarkResult(result, { precision, threshold, outputFn, nocolor });
}

function _prettyBenchmarkResult(
  results: BenchmarkRunResult,
  options: ResultOptions,
): BenchmarkRunResult {
  if (options.nocolor) c.setColorEnabled(false);

  let strresult = "";

  results.results.forEach((r) => {
    strresult += prettyBenchmarkHeader(r.name, options);
    if (r.runsCount == 1) {
      strresult += prettyBenchmarkSingleRunMetrics(r, options);
    } else {
      strresult += prettyBenchmarkMultipleRunMetrics(r, options);
      strresult += prettyBenchmarkMultipleRunBody(r, options);
    }
  });

  options.outputFn(strresult);

  if (options.nocolor) c.setColorEnabled(true);

  return results;
}

function prettyBenchmarkHeader(name: string, options: ResultOptions) {
  let strresult = "";
  strresult += c.green(prettyBenchmarkSeparator()) + "\n";
  strresult += padEndVisible(
    `${c.green("|")}    ${`Benchmark name: ${c.cyan(name)}`}`,
    padLength() + 1,
  ) + `${c.green("|")}\n`;
  strresult += c.green(prettyBenchmarkSeparator()) + "\n";

  return strresult;
}

function prettyBenchmarkSingleRunMetrics(
  result: BenchmarkResult,
  options: ResultOptions,
) {
  let strresult = "";
  const totalRuns = `Total runs: ${c.yellow("1".padEnd(7))}`;
  const totalMS = `Total time: ${
    padEndVisible(`${c.yellow(num(result.totalMs))} ms`, 16)
  }`;
  const metrics = `${totalRuns}${c.green("|")}  ${totalMS}${c.green("|")}`;

  strresult += padEndVisible(`${c.green("|")}    ${metrics}`, padLength() + 1) +
    `${c.green("|")}\n`;
  strresult += c.green(prettyBenchmarkSeparator()) + "\n";

  return strresult;
}

function prettyBenchmarkMultipleRunMetrics(
  result: BenchmarkResult,
  options: ResultOptions,
) {
  let strresult = "";
  const totalRuns = `Total runs: ${
    padEndVisible(c.yellow((result.runsCount).toString()), 7)
  }`;
  const totalMS = `Total time: ${
    padEndVisible(`${c.yellow(num(result.totalMs))} ms`, 16)
  }`;
  const avgRun = `Avg time: ${
    padEndVisible(`${c.yellow(num(result.measuredRunsAvgMs!))} ms`, 8)
  }`;
  const metrics = `${totalRuns}${c.green("|")}  ${totalMS}${
    c.green("|")
  }   ${avgRun}`;

  strresult += padEndVisible(`${c.green("|")}    ${metrics}`, padLength() + 1) +
    `${c.green("|")}\n`;
  strresult += c.green(prettyBenchmarkSeparator()) + "\n";

  return strresult;
}

function prettyBenchmarkMultipleRunBody(
  result: BenchmarkResult,
  options: ResultOptions,
) {
  let strresult = "";
  //console.log(JSON.stringify(result.measuredRunsMs?.sort())); // TODO fix grouping
  const max = Math.max(...result.measuredRunsMs);
  const min = Math.min(...result.measuredRunsMs);
  const unit = (max - min) / options.precision;
  let r = result.measuredRunsMs.reduce((prev, runMs, i, a) => { // TODO !
    // console.log(min, max, unit, runMs, ((runMs-min)/unit), ((runMs-min)/unit)*10, Math.ceil(((runMs-min)/unit)));
    prev[Math.min(Math.ceil(((runMs - min) / unit)), options.precision - 1)]++;

    return prev;
  }, new Array(options.precision).fill(0));

  // console.log(min, max, unit, r);

  strresult += `${c.cyan("|")}${"".padEnd(padLength())}${c.cyan("|")}\n`;

  /* r = r.map((v, i) => 72+Math.ceil(Math.random()*50*i*i));
      result.runsCount = r.reduce((pv, n) => pv+n);
      console.log(r, result.runsCount);*/

  const rMax = Math.max(...r);
  r.forEach((r: number, i: number) => {
    let rc = r;
    const rp = r / result.runsCount * 100;
    if (rMax > 61) {
      rc = Math.ceil(rp / 100 * 61);
    }

    const groupHead = min + i * unit; // TODO Handle precision. if eg. bigger then 100, only fixed 2/3
    const bar = Array(rc).fill("=").join("");

    const colorFn = getTimeColor(
      result.name,
      groupHead,
      options.nocolor,
      options.threshold,
    );

    const fullBar = colorFn(bar);

    const count = r.toString().padStart(6);
    const percent = perc(rp).padStart(4) + "%";

    strresult += padEndVisible(
      `${c.cyan("|")} ${
        padEndVisible(
          `${num(groupHead, true)} ms`,
          Math.max(num(max).length, 6),
        )
      } _[${count}][${percent}] ${c.cyan("|")} ${fullBar}`,
      padLength() + 1,
    ) + `${c.cyan("|")}\n`;
  });

  strresult += `${c.cyan("|")}${"".padEnd(padLength())}${c.cyan("|")}\n`;
  strresult += `${c.cyan(prettyBenchmarkSeparator())}\n`;
  strresult += "\n";

  return strresult;
}

function prettyBenchmarkSeparator() {
  return `+-------------------------------------------------------------------------------------------+`;
}

function padLength() {
  return prettyBenchmarkSeparator().length - 2;
}
