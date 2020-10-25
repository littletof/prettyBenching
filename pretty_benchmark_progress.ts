import { Colorer } from "./colorer.ts";
import { BenchmarkResult, ProgressState } from "./deps.ts";
import { getPaddedIndicator, getTimeColor } from "./common.ts";
import { getTimePadSize, num, padEndVisible, usingHrTime } from "./utils.ts";

import type { BenchmarkRunProgress, BenchmarkRunResult } from "./deps.ts";
import type { BenchIndicator, Thresholds } from "./types.ts";

const headerPadding = "▒▒▒▒▒▒▒▒";
const c: Colorer = new Colorer();

/** Defines how the resulting output should look like. */
export interface prettyBenchmarkProgressOptions {
  /** If provided, the results will be colored accordingly */
  thresholds?: Thresholds;
  /** If provided, the indicators will be placed before the specific benches */
  indicators?: BenchIndicator[];
  /** Adds the returned string at the end of each finished benchmark row */
  rowExtras?: (
    result: BenchmarkResult,
    options: prettyBenchmarkProgressOptions,
  ) => string;
  /** Strips all default colors from the output. 
   * 
   * *Note*: it doesnt strip the colors that come through user defined `thresholds` and `indicators`  */
  nocolor?: boolean;
  /** Overrides the default output function, which is `console.log`. */
  outputFn?: (log: string) => unknown;
}

/** Returns a function that expects `BenchmarkRunProgress` object, which than prints 
 * the benchmarking progress in a nicely formatted way, based on the provided `options`.
 * 
 * Typical basic usage:
 * 
 * ```ts
 * // add benches, then
 * runBenchmarks({silent: true}, prettyBenchmarkProgress());
 * ```
 * .
 */
export function prettyBenchmarkProgress(
  /** Defines how the output should look like */
  options?: prettyBenchmarkProgressOptions,
) {
  if (options?.nocolor) c.setColorEnabled(false);

  return (progress: BenchmarkRunProgress) =>
    _prettyBenchmarkProgress(progress, options);
}

function _prettyBenchmarkProgress(
  progress: BenchmarkRunProgress,
  options?: prettyBenchmarkProgressOptions,
) {
  const up1Line = "\x1B[1A";
  const out = typeof options?.outputFn === "function"
    ? options.outputFn
    : console.log;

  // Started benching
  if (progress.state === ProgressState.BenchmarkingStart) {
    const line = startBenchingLine(progress, options);
    out(line);
    return;
  }

  // Starting bench run
  if (progress.state === ProgressState.BenchStart) {
    const line = startingBenchmarkLine(progress, options);
    out(`${line}\t`);
    return;
  }

  // Multiple run bench partial result
  if (progress.state === ProgressState.BenchPartialResult) {
    const line = runningBenchmarkLine(progress, options);
    out(`${up1Line}\r${line}\t`);
    return;
  }

  // Bench run result
  if (progress.state === ProgressState.BenchResult) {
    const line = finishedBenchmarkLine(progress, options);
    const appended = typeof options?.rowExtras === "function"
      ? options.rowExtras([...progress.results].reverse()[0], options)
      : "";

    out(`${up1Line}\r${line}${appended}`);
    return;
  }

  // Finished benching
  if (progress.state === ProgressState.BenchmarkingEnd) {
    if (progress.running) {
      out("\n"); // Double empty line
      out(
        c.red(
          `${headerPadding} Benchmarking failed\n${headerPadding} An error was thrown while running benchmark [${progress.running.name}]\n`,
        ),
      );
      return;
    }
    out(""); // Empty line
    considerPrecise(progress);
    const cyanHeader = `${c.cyan(headerPadding)}`;
    out(`${cyanHeader} Benchmarking finished\n`);
    return;
  }
}

function considerPrecise(result: BenchmarkRunResult) {
  if (
    !usingHrTime() &&
    !!result.results.find(({ measuredRunsAvgMs }) => measuredRunsAvgMs < 10)
  ) {
    const yellowHeader = `${c.yellow(headerPadding)}`;
    console.log(
      `${yellowHeader} Consider running benchmarks with ${
        c.yellow(`--allow-hrtime`)
      } for a more precise measurement`,
    );
  }
}

function startingBenchmarkLine(
  progress: BenchmarkRunProgress,
  options?: prettyBenchmarkProgressOptions,
): string {
  const fullName = benchNameFormatted(progress.running!.name, options);
  const fullTimes = `[${
    c.yellow(progress.running!.runsCount.toString().padStart(7))
  }]`;

  return `Running ${fullName} a total of ${fullTimes} times`;
}

function runningBenchmarkLine(
  progress: BenchmarkRunProgress,
  options?: prettyBenchmarkProgressOptions,
): string {
  const percent = Math.round(
    progress.running!.measuredRunsMs.length / progress.running!.runsCount * 100,
  );

  const fullName = benchNameFormatted(progress.running!.name, options);

  const maxBarLength = 48; // needs to be even
  const progressBar = Array(Math.ceil(percent / 100 * maxBarLength)).fill("=")
    .join("").padEnd(
      maxBarLength,
    );

  const inserted = progressBar.substr(0, maxBarLength / 2 - 2) +
    c.white(
      `${percent.toString().padEnd(2)}${
        percent == 100 ? "" : c.green(progressBar.substr(maxBarLength / 2, 1))
      }%`,
    ) + progressBar.substr(maxBarLength / 2 + 2);

  const fullProgressBar = `${c.yellow("[")}${c.green(inserted)}${
    c.yellow("]")
  }`;

  const progressDone = `${
    progress.running!.measuredRunsMs.length.toString().padStart(6)
  }`;
  const progressTotal = `${progress.running!.runsCount.toString().padStart(6)}`;
  const progressCount = `[${c.green(progressDone)}/${c.yellow(progressTotal)}]`;

  return `Running ${fullName} ${progressCount} ${fullProgressBar}`;
}

function finishedBenchmarkLine(
  progress: BenchmarkRunProgress,
  options?: prettyBenchmarkProgressOptions,
): string {
  const result = [...progress.results].reverse()[0];

  const fullName = benchNameFormatted(result.name, options);

  const fullCount = `Runs: [${
    c.yellow((result.runsCount || 1).toString().padStart(7))
  }]`;

  const fullTotalTime = `Total time: [${
    c.yellow(
      num(result.totalMs).padStart(getTimePadSize()),
    )
  }${c.gray("ms")}]`;

  const avgTime = result.measuredRunsAvgMs;
  const paddedAvgTime = num(avgTime, true).padStart(getTimePadSize());
  const colorFn = getTimeColor(
    result.name,
    avgTime,
    options?.nocolor,
    options?.thresholds,
  );
  const coloredTime = colorFn(paddedAvgTime);
  const fullAverage = `Avg: [${coloredTime}${c.gray("ms")}]`;

  return `Benched ${fullName} ${fullCount} ${fullTotalTime} ${fullAverage}`;
}

function startBenchingLine(
  progress: BenchmarkRunProgress,
  options?: prettyBenchmarkProgressOptions,
): string {
  const cyanHeader = `${c.cyan(headerPadding)}`;
  const fullQueued = `Benchmarks queued: [${
    c.yellow(progress.queued!.length.toString().padStart(5))
  }]`;
  const fullFiltered = c.gray(
    ` filtered: [${progress.filtered.toString().padStart(5)}]`,
  );

  return `\n${cyanHeader} Starting benchmarking\n${cyanHeader} ${fullQueued} ${fullFiltered}\n`;
}

function benchNameFormatted(
  name: string,
  options?: prettyBenchmarkProgressOptions,
) {
  let ob = "[";
  let clb = "]";
  if (options?.indicators) {
    const indicator = options.indicators.find(({ benches }) =>
      benches.test(name)
    );
    if (typeof indicator?.color === "function") {
      ob = indicator.color(ob);
      clb = indicator.color(clb);
    }
  }

  return `${
    getPaddedIndicator(name, options?.indicators ? 2 : 0, options?.indicators)
  }` +
    `${ob}${c.cyan(name)} ${
      c.gray(padEndVisible("", 40 - name.length, "-"))
    }${clb}`;
}
