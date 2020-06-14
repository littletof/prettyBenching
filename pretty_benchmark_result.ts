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
  rtime,
} from "./utils.ts";
import { Colorer } from "./colorer.ts";
import { TableBuilder } from "./table.ts";

const c: Colorer = new Colorer();
const tab = "    ";

export interface prettyBenchmarkResultOptions {
  precision?: number;
  thresholds?: { [key: string]: { green: number; yellow: number } };
  // deno-lint-ignore no-explicit-any
  outputFn?: (log: string) => any;
  nocolor?: boolean;
}

interface ResultOptions {
  precision: number;
  thresholds?: { [key: string]: { green: number; yellow: number } };
  // deno-lint-ignore no-explicit-any
  outputFn: (log: string) => any;
  nocolor: boolean;
}

export function prettyBenchmarkResult(
  { precision = 5, thresholds, outputFn = console.log, nocolor = false }:
    prettyBenchmarkResultOptions = { precision: 5, outputFn: console.log },
) {
  return (result: BenchmarkRunResult) =>
    _prettyBenchmarkResult(
      result,
      { precision, thresholds, outputFn, nocolor },
    );
}

function _prettyBenchmarkResult(
  results: BenchmarkRunResult,
  options: ResultOptions,
): BenchmarkRunResult {
  if (options.nocolor) c.setColorEnabled(false);

  const output = results.results.map((r) => {
    const tb = new TableBuilder(91, c.green); // 91

    prettyBenchmarkHeader(tb, r, options);
    if (r.runsCount == 1) {
      prettyBenchmarkSingleRunMetrics(tb, r, options);
    } else {
      prettyBenchmarkMultipleRunMetrics(tb, r, options);
      prettyBenchmarkMultipleRunBody(tb, r, options);
    }

    return tb.build();
  }).join("\n");

  options.outputFn(output);

  if (options.nocolor) c.setColorEnabled(true);

  return results;
}

function prettyBenchmarkHeader(
  tb: TableBuilder,
  r: BenchmarkResult,
  options: ResultOptions,
) {
  tb.line(`${tab}${`Benchmark name: ${c.cyan(r.name)}`}`);
  tb.separator();
}

function prettyBenchmarkSingleRunMetrics(
  tb: TableBuilder,
  result: BenchmarkResult,
  options: ResultOptions,
) {
  const totalRuns = `Total runs: ${c.yellow("1".padEnd(7))}`;
  const totalMS = `Total time: ${
    padEndVisible(`${c.yellow(num(result.totalMs))} ms`, 16)
  }`;

  tb.cellLine(`${tab}${totalRuns}`, `  ${totalMS}`);
  tb.separator();
}

function prettyBenchmarkMultipleRunMetrics(
  tb: TableBuilder,
  result: BenchmarkResult,
  options: ResultOptions,
) {
  const totalRuns = `Total runs: ${
    padEndVisible(c.yellow((result.runsCount).toString()), 7)
  }`;
  const totalMS = `Total time: ${
    padEndVisible(`${c.yellow(num(result.totalMs))} ms`, 16)
  }`;
  const avgRun = `Avg time: ${
    padEndVisible(`${c.yellow(num(result.measuredRunsAvgMs!))} ms`, 8)
  }`;

  tb.cellLine(`${tab}${totalRuns}`, `  ${totalMS}`, `  ${avgRun}`);
  tb.separator();
}

function prettyBenchmarkMultipleRunBody(
  tb: TableBuilder,
  result: BenchmarkResult,
  options: ResultOptions,
) {
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

  tb.tc(c.gray).cellLine(" ".repeat(31));

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
      options.thresholds,
    );

    const fullBar = colorFn(bar);

    const count = r.toString().padStart(6);
    const percent = perc(rp).padStart(4) + "%";

    const barHeader = ` ${
      padStartVisible(
        `${rtime(groupHead)} ms`,
        Math.max(rtime(max).length, 12),
      )
    } _[${count}][${percent}] `;

    tb.tc(c.gray).cellLine(barHeader, fullBar);
  });

  tb.tc(c.gray).cellLine(" ".repeat(31));
  tb.separator();
}
