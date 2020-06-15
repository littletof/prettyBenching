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
  getBenchIndicator,
} from "./utils.ts";
import { Colorer } from "./colorer.ts";
import { TableBuilder } from "./table.ts";

const c: Colorer = new Colorer();
const tab = "    ";

type Indicators = {
  benches: RegExp;
  modFn?: (str: string) => string;
  tableColor?: (str: string) => string;
};

export interface prettyBenchmarkResultOptions {
  precision?: number;
  thresholds?: { [key: string]: { green: number; yellow: number } };
  indicators?: Indicators[];
  // deno-lint-ignore no-explicit-any
  outputFn?: (log: string) => any;
  nocolor?: boolean;
}

interface ResultOptions {
  precision: number;
  thresholds?: { [key: string]: { green: number; yellow: number } };
  indicators?: Indicators[];
  // deno-lint-ignore no-explicit-any
  outputFn: (log: string) => any;
  nocolor: boolean;
}

export function prettyBenchmarkResult(
  {
    precision = 5,
    thresholds,
    indicators,
    outputFn = console.log,
    nocolor = false,
  }: prettyBenchmarkResultOptions = { precision: 5, outputFn: console.log },
) {
  return (result: BenchmarkRunResult) =>
    _prettyBenchmarkResult(
      result,
      { precision, thresholds, indicators, outputFn, nocolor },
    );
}

function _prettyBenchmarkResult(
  results: BenchmarkRunResult,
  options: ResultOptions,
): BenchmarkRunResult {
  if (options.nocolor) c.setColorEnabled(false);

  const output = results.results.map((r) => {
    const tableColor = getTableColor(r.name, options.indicators);
    const tb = new TableBuilder(91, tableColor);

    prettyBenchmarkHeader(tb, r, options);
    if (r.runsCount == 1) {
      prettyBenchmarkSingleRunMetrics(tb, r, options);
    } else {
      prettyBenchmarkMultipleRunMetrics(tb, r, options);
      prettyBenchmarkMultipleRunCalcedMetrics(tb, r, options);
      if (r.runsCount >= 10) prettyBenchmarkMultipleRunBody(tb, r, options);
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
  const indicator = getBenchIndicator(r.name, options.indicators);
  const indTab = indicator == ""
    ? tab
    : padStartVisible(`${indicator} `, tab.length);
  tb.line(`${indTab}${`Benchmark name: ${c.cyan(r.name)}`}`);
  tb.separator();
}

function prettyBenchmarkSingleRunMetrics(
  tb: TableBuilder,
  result: BenchmarkResult,
  options: ResultOptions,
) {
  const totalRuns = `Total runs: ${c.yellow("1".padEnd(7))}`;
  const totalMS = `Total time: ${
    padEndVisible(`${c.yellow(rtime(result.totalMs, 4))} ms`, 16)
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
    padEndVisible(`${c.yellow(rtime(result.totalMs, 4))} ms`, 16)
  }`;
  const avgRun = `Avg time: ${
    padEndVisible(`${c.yellow(rtime(result.measuredRunsAvgMs, 4))} ms`, 8)
  }`;

  tb.cellLine(`${tab}${totalRuns}`, `  ${totalMS}`, `  ${avgRun}`);
  tb.separator();
}

function prettyBenchmarkMultipleRunCalcedMetrics(
  tb: TableBuilder,
  result: BenchmarkResult,
  options: ResultOptions,
) {
  const max = Math.max(...result.measuredRunsMs);
  const min = Math.min(...result.measuredRunsMs);
  const mean = (max + min) / 2; // not as avg

  const sorted = [...result.measuredRunsMs].sort();
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length == 0
    ? 0
    : (sorted.length % 2 == 0 ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2);

  tb.cellLine(
    `${tab}min: ${timeStr(min)} `,
    ` max: ${timeStr(max)} `,
    ` mean: ${timeStr(mean)} `,
    ` median: ${timeStr(median)} `,
  );
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
  let r = result.measuredRunsMs.reduce((prev, runMs, i, a) => {
    // console.log(min, max, unit, runMs, ((runMs-min)/unit), ((runMs-min)/unit)*10, Math.ceil(((runMs-min)/unit)));
    prev[Math.min(Math.ceil(((runMs - min) / unit)), options.precision - 1)]++;

    return prev;
  }, new Array(options.precision).fill(0));

  tb.tc(c.gray).cellLine(" ".repeat(31));

  const rMax = Math.max(...r);
  const maxBarLength = 58;
  r.forEach((r: number, i: number) => {
    let rc = r;
    const rp = r / result.runsCount * 100;
    if (rMax > maxBarLength) {
      rc = Math.ceil(rp / 100 * maxBarLength);
    }

    const groupHead = min + i * unit;
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

function timeStr(time: number, from: number = 3) {
  return padEndVisible(`${c.yellow(rtime(time, from))} ms `, 9 + 4);
}

function getTableColor(name: string, indicators?: Indicators[]) {
  if (indicators && indicators.length > 0) {
    const indicator = indicators.find(({ benches }) => benches.test(name));
    return !!indicator && typeof indicator.tableColor == "function"
      ? indicator.tableColor
      : c.green;
  }

  return c.green;
}
