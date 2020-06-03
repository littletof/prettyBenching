import {
  BenchmarkRunProgress,
  ProgressState,
  cyan,
  green,
  yellow,
  gray,
  red,
  BenchmarkRunResult,
} from "./deps.ts";

import {
  getTimeColor,
  getTimePadSize,
  getTimePrecision,
  usingHrTime,
} from "./utils.ts";

const headerPadding = "▒▒▒▒▒▒▒▒";

export function prettyBenchmarkProgress(
  options: {
    threshold?: {
      [key: string]: { green: number; yellow: number };
    };
  } = {},
) {
  return (progress: any /* BenchmarkRunProgress */) =>
    _prettyBenchmarkProgress(progress, options);
}

function _prettyBenchmarkProgress(
  progress: BenchmarkRunProgress,
  options: {
    threshold?: {
      [key: string]: { green: number; yellow: number };
    };
  },
) {
  // Started benching
  if (progress.state === ProgressState.BenchmarkingStart) {
    const line = startBenchingLine(progress);
    console.log(line);
    return;
  }

  // Starting bench run
  if (progress.state === ProgressState.BenchStart) {
    const line = startingBenchmarkLine(progress);
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${line}`));
    return;
  }

  // Multiple run bench partial result
  if (progress.state === ProgressState.BenchPartialResult) {
    const line = runningBenchmarkLine(progress);
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${line}`));
    return;
  }

  // Bench run result
  if (progress.state === ProgressState.BenchResult) {
    const line = finishedBenchmarkLine(progress, options);
    // console.log(line);
    Deno.stdout.writeSync(
      new TextEncoder().encode(`\r\r${line.padEnd(200)}\n`),
    );
    return;
  }

  // Finished benching
  if (progress.state === ProgressState.BenchmarkingEnd) {
    console.log("\n");
    considerPrecise(progress);
    const cyanHeader = `${cyan(headerPadding)}`;
    console.log(`${cyanHeader} Benchmarking finished\n`);
    return;
  }
}

function considerPrecise(result: BenchmarkRunResult) {
  if (
    !usingHrTime() && !!result.results.find(({ totalMs, runsCount }) =>
      (totalMs / runsCount!) < 10
    )
  ) {
    const yellowHeader = `${yellow(headerPadding)}`;
    console.log(
      `${yellowHeader} Consider running benchmarks with --allow-hrtime for a more precise measurement`,
    );
  }
}

function startingBenchmarkLine(progress: any): string {
  const fullName = `[${cyan(progress.running.name.padEnd(40, "-"))}]`;
  const fullTimes = `[${
    yellow(progress.running.runsCount.toString().padStart(5))
  }]`;

  return `Running ${fullName} a total of ${fullTimes} times`;
}

function runningBenchmarkLine(progress: any): string {
  const percent = Math.round(
    progress.running.measuredRunsMs.length / progress.running.runsCount * 100,
  );

  const fullName = `[${cyan(progress.running.name.padEnd(40, "-"))}]`;

  const fullPercent = `[${percent.toString().padStart(3)}%]`;

  const progressBar = Array(Math.ceil(percent / 2)).fill("=").join("").padEnd(
    50,
  );
  const fullProgressBar = `${yellow("[")}${green(progressBar)}${yellow("]")}`;

  const progressDone = `${
    progress.running.measuredRunsMs.length.toString().padStart(5)
  }`;
  const progressTotal = `${progress.running.runsCount.toString().padStart(5)}`;
  const progressCount = `[${green(progressDone)}/${yellow(progressTotal)}]`;

  return `Running ${fullName}  ${progressCount} ${fullPercent} ${fullProgressBar}`;
}

function finishedBenchmarkLine(
  progress: any,
  options?: {
    threshold?: {
      [key: string]: { green: number; yellow: number };
    };
  },
): string {
  const result = [...progress.results].reverse()[0];

  const fullName = `[${cyan(result.name.padEnd(40, "-"))}]`;

  const fullCount = `Runs: [${
    yellow((result.runsCount || 1).toString().padStart(6))
  }]`;

  const fullTotalTime = `Total time: [${
    yellow(
      result.totalMs.toFixed(getTimePrecision()).padStart(getTimePadSize()),
    )
  }${gray("ms")}]`;

  const avgTime = !!result.measuredRunsAvgMs
    ? result.measuredRunsAvgMs
    : result.totalMs;

  const colorFn = getTimeColor(result.name, avgTime, options?.threshold);
  const fullAverage = `Avg: [${
    colorFn(avgTime.toFixed(getTimePrecision()).padStart(getTimePadSize()))
  }${gray("ms")}]`;

  return `Benched ${fullName} ${fullCount} ${fullTotalTime} ${fullAverage}`;
}

function startBenchingLine(progress: any): string {
  const cyanHeader = `${cyan(headerPadding)}`;
  const fullQueued = `Benchmarks queued: [${
    yellow(progress.queued.length.toString().padStart(5))
  }]`;
  const fullFiltered = gray(
    ` filtered: [${progress.filtered.toString().padStart(5)}]`,
  );

  return `\n${cyanHeader} Starting benchmarking\n${cyanHeader} ${fullQueued} ${fullFiltered}\n`;
}
