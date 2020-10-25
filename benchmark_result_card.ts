import {
  calculateExtraMetrics,
  getPaddedIndicator,
  getTimeColor,
  substrColored,
} from "./common.ts";

import { padEndVisible, padStartVisible, perc, rtime } from "./utils.ts";

import { TableBuilder } from "./table.ts";
import type { Colorer } from "./colorer.ts";
import type { BenchmarkResult } from "./deps.ts";
import type { BenchIndicator, Thresholds } from "./types.ts";

/** Defines the options for card formatted results */
export interface prettyBenchmarkCardResultOptions {
  // type: "card"; TODO when multiple options
  /** If provided, the measured values will be colored accordingly in the card. Also needed, if `parts.threshold` is set to `true` */
  thresholds?: Thresholds;
  /** If provided, the indicators will be placed for the specific benches */
  indicators?: BenchIndicator[];
  /** Strips all default colors from the output. 
   * 
   * *Note*: it doesnt strip the colors that come through user defined `thresholds` and `indicators`  */
  nocolor?: boolean;
  /** Overrides the default card `parts` option, which is ```{graph: true, graphBars: 5}```  */
  parts?: {
    /** Adds extra calculated metrics line to the card, which consists of `min`, `max`, `mean as ((min+max)/2)` and `median` */
    extraMetrics?: boolean;
    /** Add a line, where the threshold ranges are shown. Only shown, when a `Threshold` was provided for the specific benchmark. */
    threshold?: boolean;
    /** Add a graph, that shows the distribution of the runs. It's only shown above `9` runs */
    graph?: boolean;
    /** Defines how many groups the distribution graph should use. */
    graphBars?: number;
  };
  /** Add a cell with the generated content at the end of the header row of the result card. Overflowing text is cut. */
  infoCell?: (
    result: BenchmarkResult,
    options: prettyBenchmarkCardResultOptions,
  ) => string;
}

const tab = "    ";
const indPlaceholder = "˘˘˘˘";
let c: Colorer;

export function getResultCard(
  result: BenchmarkResult,
  colorer: Colorer,
  options?: prettyBenchmarkCardResultOptions,
) {
  c = colorer;

  const defaultOptions: prettyBenchmarkCardResultOptions = {
    parts: { graph: true, graphBars: 5 },
  };

  // define default options and default parts
  options = options || defaultOptions;
  if (!options.parts) {
    options.parts = defaultOptions.parts;
  }

  const tableColor = getTableColor(result.name, options?.indicators);
  const tb = new TableBuilder(91, tableColor);

  const needsThreshold = options.parts!.threshold && !!options.thresholds &&
    Object.keys(options.thresholds).length != 0;

  prettyBenchmarkHeader(tb, result, options);
  if (result.runsCount == 1) {
    prettyBenchmarkSingleRunMetrics(tb, result, options);
    needsThreshold && prettyBenchmarkThresholdLine(tb, result, options);
  } else {
    prettyBenchmarkMultipleRunMetrics(tb, result, options);
    options.parts!.extraMetrics &&
      prettyBenchmarkMultipleRunCalcedMetrics(tb, result, options);
    needsThreshold && prettyBenchmarkThresholdLine(tb, result, options);
    if (options.parts!.graph && result.runsCount >= 10) {
      prettyBenchmarkMultipleRunGraph(tb, result, options);
    }
  }

  let table = tb.build();

  // replace the indicator placeholder with the correct indicator
  table = table.replace(
    indPlaceholder,
    getPaddedIndicator(
      result.name,
      indPlaceholder.length - 1,
      options?.indicators,
    ) + " ",
  );

  return table;
}

function prettyBenchmarkHeader(
  tb: TableBuilder,
  r: BenchmarkResult,
  options: prettyBenchmarkCardResultOptions,
) {
  const head = `${indPlaceholder}${`Benchmark name: ${
    c.cyan(r.name.padEnd(43))
  }`}`;

  if (typeof options?.infoCell === "function") {
    let infoCell = options.infoCell(r, options);
    infoCell = substrColored(infoCell, 27);

    tb.cellLine(head, infoCell);
  } else {
    tb.line(head);
  }

  tb.separator();
}

function prettyBenchmarkSingleRunMetrics(
  tb: TableBuilder,
  result: BenchmarkResult,
  options: prettyBenchmarkCardResultOptions,
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
  options: prettyBenchmarkCardResultOptions,
) {
  const threshold = options.thresholds && options.thresholds[result.name];
  if (threshold) {
    const sep = "=".repeat(10);
    tb.line(
      `${tab}Thresholds:  ${c.green(`0 ${sep} ${rtime(threshold.green)}`)} ${
        c.yellow(`${sep} ${rtime(threshold.yellow)}`)
      } ${c.red(`${sep} ∞`)}`,
    );
    tb.separator();
  }
}

function prettyBenchmarkMultipleRunMetrics(
  tb: TableBuilder,
  result: BenchmarkResult,
  options: prettyBenchmarkCardResultOptions,
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
  options: prettyBenchmarkCardResultOptions,
) {
  const { max, min, mean, median } = calculateExtraMetrics(result);

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
  options: prettyBenchmarkCardResultOptions,
) {
  const barsCount = options.parts!.graphBars || 5;

  const max = Math.max(...result.measuredRunsMs);
  const min = Math.min(...result.measuredRunsMs);
  const unit = (max - min) / barsCount;
  const r = result.measuredRunsMs.reduce((prev, runMs, i, a) => {
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

function timeStr(time: number, from = 3) {
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
