import {
  BenchmarkRunResult,
  BenchmarkResult,
  // BenchmarkRunProgress,
  cyan,
  green,
  yellow,
  gray,
  red,
} from "./deps.ts";

export function prettyBenchmarkResult(
  { precision = 10 }: { precision?: number } = {},
) {
  return (result: BenchmarkRunResult) =>
    _prettyBenchmarkResult(result, precision);
}

function _prettyBenchmarkResult(
  results: BenchmarkRunResult,
  precision: number,
): BenchmarkRunResult {
  results.results.forEach((r) => {
    prettyBenchmarkHeader(r.name);

    if (!r.runsCount) {
      prettyBenchmarkSingleRunMetrics(r);
    } else {
      prettyBenchmarkMultipleRunMetrics(r);
      prettyBenchmarkMultipleRunBody(r, precision);
    }
  });

  return results;
}

function prettyBenchmarkHeader(name: string) {
  console.log(green(prettyBenchmarkSeparator()));
  console.log(
    `${green("|")}    ${
      `Benchmark name: ${cyan(name)}`.padEnd(padLength() + 6)
    }${green("|")}`,
  );
  console.log(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkSingleRunMetrics(result: BenchmarkResult) {
  const totalRuns = `Total runs: ${yellow("1".padEnd(7))}`;
  const totalMS = `Total run time: ${
    `${yellow(result.totalMs.toString())} ms`.padEnd(10 + 3 + 10)
  }`;
  const metrics = `${totalRuns}${green("|")}  ${totalMS}${green("|")}`;

  console.log(
    `${green("|")}    ${metrics.padEnd(padLength() + 40 - 4)}${green("|")}`,
  );
  console.log(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkMultipleRunMetrics(result: BenchmarkResult) {
  const totalRuns = `Total runs: ${
    yellow(result.runsCount!.toString().padEnd(7))
  }`;
  const totalMS = `Total run time: ${
    `${yellow(result.totalMs.toString())} ms`.padEnd(10 + 3 + 10)
  }`;
  const avgRun = `Average run time: ${
    `${yellow(result.measuredRunsAvgMs!.toString())} ms`.padEnd(8 + 3 + 10)
  }`;
  const metrics = `${totalRuns}${green("|")}  ${totalMS}${
    green("|")
  }   ${avgRun}`;

  console.log(
    `${green("|")}    ${metrics.padEnd(padLength() + 50 - 4)}${green("|")}`,
  );
  console.log(green(prettyBenchmarkSeparator()));
}

function prettyBenchmarkMultipleRunBody(
  result: BenchmarkResult,
  precision: number,
) {
  const max = Math.max(...result.measuredRunsMs!);
  const min = Math.min(...result.measuredRunsMs!);
  const unit = (max - min) / precision;
  let r = result.measuredRunsMs!.reduce((prev, runMs, i, a) => {
    // console.log(min, max, unit, runMs, ((runMs-min)/unit), ((runMs-min)/unit)*10, Math.ceil(((runMs-min)/unit)));
    prev[Math.min(Math.ceil(((runMs - min) / unit)), precision - 1)]++;

    return prev;
  }, new Array(precision).fill(0));

  // console.log(min, max, unit, r);

  console.log(`${cyan("|")}${"".padEnd(padLength())}${cyan("|")}`);

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
    const bar = Array(rc).fill("=").join("").padEnd(padLength() - 26);
    const count = r.toString().padStart(5);
    const percent = rp.toString().padStart(3) + "%";

    console.log(
      `${cyan("|")} ${
        `${Math.trunc(min + i * unit).toString()} ms`.padEnd(
          Math.max(max.toString().length, 5 + 3),
        )
      } [${count}][${percent}] ${cyan("|")} ${bar}${cyan("|")}`,
    );
  });

  console.log(`${cyan("|")}${"".padEnd(padLength())}${cyan("|")}`);
  console.log(`${cyan(prettyBenchmarkSeparator())}`);
  console.log();
}

function prettyBenchmarkSeparator() {
  return `+-------------------------------------------------------------------------------------------+`;
}

function padLength() {
  return prettyBenchmarkSeparator().length - 2;
}

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
  progress: any, /* BenchmarkRunProgress */
  options: {
    threshold?: {
      [key: string]: { green: number; yellow: number };
    };
  },
) {
  // Finished benching
  if (isFinishedBenchmarking(progress)) {
    const headerPadding = `${cyan("▒▒▒▒▒▒▒▒")}`;
    console.log(`\n${headerPadding} Benchmarking finished\n`);
    return;
  }

  // Started benching
  if (isStartedBenchmarking(progress)) {
    const line = startBenchingLine(progress);
    console.log(line);
    return;
  }

  // Starting bench run
  if (isStartedBenchRun(progress)) {
    const line = startingBenchmarkLine(progress);
    Deno.stdout.writeSync(new TextEncoder().encode(`${line}\r`));
    return;
  }

  // Multiple run bench partial result
  if (isPartialBenchRunResult(progress)) {
    const line = runningBenchmarkLine(progress);
    Deno.stdout.writeSync(new TextEncoder().encode(`${line}\r`));
    return;
  }

  // Bench run result
  if (isBenchRunResult(progress)) {
    const line = finishedBenchmarkLine(progress, options);
    console.log(line.padEnd(200));
    return;
  }
}

function startingBenchmarkLine(progress: any): string {
  const fullName = `[${cyan(progress.running.name.padEnd(40, "-"))}]`;
  const fullTimes = `[${
    yellow(progress.running.runsCount.toString().padStart(5))
  }]`;

  return ` Running ${fullName} a total of ${fullTimes} times`;
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

  const progressCount = `[${
    progress.running.measuredRunsMs.length.toString().padStart(5)
  }/${progress.running.runsCount.toString().padStart(5)}]`;

  return ` Running ${fullName} ${fullPercent} ${progressCount} ${fullProgressBar}`;
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
    yellow(result.totalMs.toString().padStart(7))
  } ${gray("ms")}]`;

  const avgTime = !!result.measuredRunsAvgMs
    ? result.measuredRunsAvgMs
    : result.totalMs;

  const colorFn = getTimeColor(result.name, avgTime, options);

  const fullAverage = `Avg: [${colorFn(avgTime.toString().padStart(7))} ${
    gray("ms")
  }]`;

  return `Benched ${fullName} ${fullCount} ${fullTotalTime} ${fullAverage}`;
}

function getTimeColor(name: string, time: number, options: any) {
  const threshold = options.threshold && options.threshold[name];
  // console.log(threshold, options, name);
  if (!!threshold) {
    if (time <= threshold.green) return green;
    if (time <= threshold.yellow) return yellow;
    if (threshold.yellow < time) return red;
  }
  return cyan;
}

function startBenchingLine(progress: any): string {
  const headerPadding = `${cyan("▒▒▒▒▒▒▒▒")}`;
  const fullQueued = `Bechmarks queued: [${
    yellow(progress.queued.length.toString().padStart(5))
  }]`;
  const fullFiltered = gray(
    ` filtered: [${progress.filtered.toString().padStart(5)}]`,
  );

  return `
${headerPadding} Starting benchmarking
${headerPadding} ${fullQueued} ${fullFiltered}
    `;
}

const isStartedBenchmarking: (progress: any) => boolean = (
  progress: any,
) => (progress.queued && progress.results.length == 0 && !progress.running);
const isStartedBenchRun: (progress: any) => boolean = (
  progress: any,
) => (progress.running && progress.running.measuredRunsMs.length == 0);
const isPartialBenchRunResult: (progress: any) => boolean = (
  progress: any,
) => (progress.running);
const isBenchRunResult: (progress: any) => boolean = (
  progress: any,
) => (progress.queued.length != 0 && !progress.running &&
  progress.results.length != 0);
const isFinishedBenchmarking: (progress: any) => boolean = (
  progress: any,
) => (!progress.queued);
