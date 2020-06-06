import {
  BenchmarkRunProgress,
  ProgressState,
  BenchmarkRunResult,
} from "./deps.ts";

import { colors } from "./deps.ts";
const { cyan, green, yellow, gray, red, white } = colors;

import {
  getTimeColor,
  getTimePadSize,
  getTimePrecision,
  usingHrTime,
  padEndVisible,
  num,
} from "./utils.ts";

const headerPadding = "▒▒▒▒▒▒▒▒";

export interface prettyBenchmarkProgressOptions {
  threshold?: { [key: string]: { green: number; yellow: number } };
  indicators?: {benches: RegExp, modFn: (str: string) => string}[]// TODO rename
  nocolor?: boolean;
}

interface ProgressOptions {
  threshold?: { [key: string]: { green: number; yellow: number } };
  indicators?: {benches: RegExp, modFn: (str: string) => string}[]// TODO rename
}

export function prettyBenchmarkProgress(
  {threshold, indicators, nocolor}: prettyBenchmarkProgressOptions = {},
) {
  // if(nocolor) { setColorEnabled(false); } // TODO will have to turn back after finished

  return (progress: BenchmarkRunProgress) =>
    _prettyBenchmarkProgress(progress, {threshold, indicators});
}

function _prettyBenchmarkProgress(
  progress: BenchmarkRunProgress,
  options: ProgressOptions,
) {
  // Started benching
  if (progress.state === ProgressState.BenchmarkingStart) {
    const line = startBenchingLine(progress, options);
    console.log(line);
    return;
  }

  // Starting bench run
  if (progress.state === ProgressState.BenchStart) {
    const line = startingBenchmarkLine(progress, options);
    // const line = runningBenchmarkLine(progress, options);
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${line}\t`));
    return;
  }

  // Multiple run bench partial result
  if (progress.state === ProgressState.BenchPartialResult) {
    const line = runningBenchmarkLine(progress, options);
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${line}\t`));
    return;
  }

  // Bench run result
  if (progress.state === ProgressState.BenchResult) {
    const line = finishedBenchmarkLine(progress, options);
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${line.padEnd(200)}\n`));
    return;
  }

  // Finished benching
  if (progress.state === ProgressState.BenchmarkingEnd) {
    console.log(); // Empty line
    considerPrecise(progress);
    const cyanHeader = `${cyan(headerPadding)}`;
    console.log(`${cyanHeader} Benchmarking finished\n`);
    return;
  }
}

function considerPrecise(result: BenchmarkRunResult) {
  if (
    !usingHrTime() &&
    !!result.results.find(({ totalMs, runsCount }) =>
      totalMs / (runsCount || 1) < 10
    )
    //!!result.results.find(({ measuredRunsAvgMs }) => measuredRunsAvgMs < 10) TODO in 0.57.0
  ) {
    const yellowHeader = `${yellow(headerPadding)}`;
    console.log(
      `${yellowHeader} Consider running benchmarks with --allow-hrtime for a more precise measurement`,
    );
  }
}

function startingBenchmarkLine(progress: any, options: ProgressOptions): string {
  const fullName = benchNameFormatted(progress.running.name, options);
  const fullTimes = `[${
    yellow(progress.running.runsCount.toString().padStart(5))
  }]`;

  return `Running ${fullName} a total of ${fullTimes} times`;
}

function runningBenchmarkLine(progress: any, options: ProgressOptions): string {
  const percent = Math.round(
    progress.running.measuredRunsMs.length / progress.running.runsCount * 100,
  );

  const fullName = benchNameFormatted(progress.running.name, options);

  const fullPercent = `[${percent.toString().padStart(3)}%]`;

  const maxBarLength = 48;
  const progressBar = Array(Math.ceil(percent / 100 * maxBarLength)).fill("=").join("").padEnd(
    maxBarLength,
  );

  // TODO test if substrings are correct
  const inserted = progressBar.substr(0, 22) + white(`${percent.toString().padEnd(2)}${percent == 100? "": green(progressBar.substr(24,1))}%`) + progressBar.substr(26);

 // const fullProgressBar = `${yellow("[")}${green(progressBar)}${yellow("]")}`;
 const fullProgressBar = `${yellow("[")}${green(inserted)}${yellow("]")}`;

  const progressDone = `${
    progress.running.measuredRunsMs.length.toString().padStart(6)
  }`;
  const progressTotal = `${progress.running.runsCount.toString().padStart(6)}`;
  const progressCount = `[${green(progressDone)}/${yellow(progressTotal)}]`;

  return `Running ${fullName} ${progressCount} ${fullProgressBar}`;
  // return `Running ${fullName} ${progressCount} ${fullPercent} ${fullProgressBar}`;
}

function finishedBenchmarkLine(
  progress: any,
  options: ProgressOptions,
): string {
  const result = [...progress.results].reverse()[0];

  const fullName = benchNameFormatted(result.name, options);

  const fullCount = ` Runs: [${
    yellow((result.runsCount || 1).toString().padStart(6))
  }]`;

  const fullTotalTime = `Total time: [${
    yellow(
      num(result.totalMs).padStart(getTimePadSize()),
    )
  }${gray("ms")}]`;

  const avgTime = !!result.measuredRunsAvgMs
    ? result.measuredRunsAvgMs
    : result.totalMs;

  const colorFn = getTimeColor(result.name, avgTime, options?.threshold);
  const fullAverage = `Avg: [${
    colorFn(num(avgTime).padStart(getTimePadSize()))
  }${gray("ms")}]`;

  return padEndVisible(`Benched ${fullName} ${fullCount} ${fullTotalTime} ${fullAverage}`, 130);
}

function startBenchingLine(progress: any, options: ProgressOptions): string {
  const cyanHeader = `${cyan(headerPadding)}`;
  const fullQueued = `Benchmarks queued: [${
    yellow(progress.queued.length.toString().padStart(5))
  }]`;
  const fullFiltered = gray(
    ` filtered: [${progress.filtered.toString().padStart(5)}]`,
  );

  return `\n${cyanHeader} Starting benchmarking\n${cyanHeader} ${fullQueued} ${fullFiltered}\n`;
}

function benchNameFormatted(name: string, options: ProgressOptions) {
  return `${getBenchIndicator(name, options)}` + `[${cyan(name)} ${gray(padEndVisible("", 40 - name.length, "-"))}]`;
}

function getBenchIndicator(name: string, options: ProgressOptions) {
  if(options.indicators && options.indicators.length > 0) {
    const indChar = "▒";//"#"; // TODO should be ▒ but doesnt work with stdout https://github.com/denoland/deno/issues/6001
    const indicator = options.indicators.find(({benches}) => benches.test(name));
    return !!indicator ? indicator.modFn(indChar) : indChar;
  }

  return "";
}
