import { BenchmarkResult } from "./deps.ts";
import { BenchIndicator, Thresholds } from "./types.ts";
import { getTimeColor,getBenchIndicator, calculateExtraMetrics } from "./common.ts";

import {
  padEndVisible,
  padStartVisible,
  perc,
  rtime
} from "./utils.ts";

import { TableBuilder } from "./table.ts";
import { Colorer } from "./colorer.ts";

export interface prettyBenchmarkCardResultOptions {
  // type: "card"; TODO when multiple options
  thresholds?: Thresholds;
  indicators?: BenchIndicator[];
  nocolor?: boolean;
  parts?: {
    extraMetrics?: boolean;
    threshold?: boolean;
    graph?: boolean;
    graphBars?: number;
  };
}

interface CardResultOptions { // TODO Delete
  thresholds?: Thresholds;
  indicators?: BenchIndicator[];
  nocolor: boolean;
  parts: {
    extraMetrics?: boolean;
    threshold?: boolean;
    graph?: boolean;
    graphBars?: number;
  };
}

const tab = "    ";
let c: Colorer;

export function getResultCard(
  result: BenchmarkResult,
  colorer: Colorer,
  {
    nocolor = false,
    indicators,
    thresholds,
    parts = { graph: true, graphBars: 5 },
  }: prettyBenchmarkCardResultOptions = {
    nocolor: false,
    parts: { graph: true, graphBars: 5 },
  },
) {
  c = colorer;
  const options: CardResultOptions = {
    parts,
    nocolor,
    indicators,
    thresholds,
  };
  const tableColor = getTableColor(result.name, options.indicators);
  const tb = new TableBuilder(91, tableColor);

  const needsThreshold = options.parts.threshold && !!options.thresholds &&
    Object.keys(options.thresholds).length != 0;

  prettyBenchmarkHeader(tb, result, options);
  if (result.runsCount == 1) {
    prettyBenchmarkSingleRunMetrics(tb, result, options);
    needsThreshold && prettyBenchmarkThresholdLine(tb, result, options);
  } else {
    prettyBenchmarkMultipleRunMetrics(tb, result, options);
    options.parts.extraMetrics &&
      prettyBenchmarkMultipleRunCalcedMetrics(tb, result, options);
    needsThreshold && prettyBenchmarkThresholdLine(tb, result, options);
    if (options.parts.graph && result.runsCount >= 10) {
      prettyBenchmarkMultipleRunGraph(tb, result, options);
    }
  }

  return tb.build();
}

function prettyBenchmarkHeader(
  tb: TableBuilder,
  r: BenchmarkResult,
  options: CardResultOptions,
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
  options: CardResultOptions,
) {
  const totalRuns = `Total runs: ${c.yellow("1".padEnd(7))}`;
  const timeColor = getTimeColor(
    result.name,
    result.totalMs,
    options.nocolor,
    options.thresholds,
  );
  const totalMS = `Total time: ${
    padEndVisible(`${timeColor(rtime(result.totalMs, 4))} ms`, 16)
  }`;

  tb.cellLine(`${tab}${totalRuns}`, `  ${totalMS}`, "");
  tb.separator();
}

function prettyBenchmarkThresholdLine(
  tb: TableBuilder,
  result: BenchmarkResult,
  options: CardResultOptions,
) {
  const threshold = options.thresholds && options.thresholds[result.name];
  if (threshold) {
    const sep = "=".repeat(10);
    tb.line(
      `${tab}Thresholds:  ${c.green(`0 ${sep} ${threshold.green}`)} ${
        c.yellow(`${sep} ${threshold.yellow}`)
      } ${c.red(`${sep} ∞`)}`,
    );
    tb.separator();
  }
}

function prettyBenchmarkMultipleRunMetrics(
  tb: TableBuilder,
  result: BenchmarkResult,
  options: CardResultOptions,
) {
  const totalRuns = `Total runs: ${
    padEndVisible(c.yellow((result.runsCount).toString()), 7)
  }`;
  const totalMS = `Total time: ${
    padEndVisible(`${c.yellow(rtime(result.totalMs, 4))} ms`, 16)
  }`;

  const timeColor = getTimeColor(
    result.name,
    result.measuredRunsAvgMs,
    options.nocolor,
    options.thresholds,
  );
  const avgRun = `Avg time: ${
    padEndVisible(`${timeColor(rtime(result.measuredRunsAvgMs, 4))} ms`, 8)
  }`;

  tb.cellLine(`${tab}${totalRuns}`, `  ${totalMS}`, `  ${avgRun}`);
  tb.separator();
}

function prettyBenchmarkMultipleRunCalcedMetrics(
  tb: TableBuilder,
  result: BenchmarkResult,
  options: CardResultOptions,
) {
  const {max, min, mean, median} = calculateExtraMetrics(result);

  const minColor = getTimeColor(
    result.name,
    min,
    options.nocolor,
    options.thresholds,
  );
  const maxColor = getTimeColor(
    result.name,
    max,
    options.nocolor,
    options.thresholds,
  );
  const meanColor = getTimeColor(
    result.name,
    mean,
    options.nocolor,
    options.thresholds,
  );
  const medianColor = getTimeColor(
    result.name,
    median,
    options.nocolor,
    options.thresholds,
  );

  tb.cellLine(
    `${tab}min: ${minColor(timeStr(min))} `,
    ` max: ${maxColor(timeStr(max))} `,
    ` mean: ${meanColor(timeStr(mean))} `,
    ` median: ${medianColor(timeStr(median))} `,
  );
  tb.separator();
}

function prettyBenchmarkMultipleRunGraph(
  tb: TableBuilder,
  result: BenchmarkResult,
  options: CardResultOptions,
) {
  const barsCount = options.parts.graphBars || 5;

  const max = Math.max(...result.measuredRunsMs);
  const min = Math.min(...result.measuredRunsMs);
  const unit = (max - min) / barsCount;
  let r = result.measuredRunsMs.reduce((prev, runMs, i, a) => {
    prev[Math.min(Math.floor(((runMs - min) / unit)), barsCount - 1)]++;

    return prev;
  }, new Array(barsCount).fill(0));

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
  return padEndVisible(`${rtime(time, from)} ${c.white("ms")} `, 9 + 4); // TODO gray ms?
}

function getTableColor(name: string, indicators?: BenchIndicator[]) {
  if (indicators && indicators.length > 0) {
    const indicator = indicators.find(({ benches }) => benches.test(name));
    return !!indicator && typeof indicator.color == "function"
      ? indicator.color
      : c.green;
  }

  return c.green;
}
