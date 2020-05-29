import {
  BenchmarkRunResult,
  BenchmarkResult,
  // BenchmarkRunProgress,
  cyan,
  green,
  yellow,
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
) {
  results.results.forEach((r) => {
    prettyBenchmarkHeader(r.name);

    if (!r.runsCount) {
      prettyBenchmarkSingleRunMetrics(r);
    } else {
      prettyBenchmarkMultipleRunMetrics(r);
      prettyBenchmarkMultipleRunBody(r, precision);
    }
  });
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

export function prettyBenchmartProgress(
  progress: any, /*BenchmarkRunProgress*/
) {
  // Finished benching
  if (!progress.queued) {
    console.log("Finished running");
    return;
  }

  // Started benching
  if (progress.queued && progress.results.length == 0 && !progress.running) {
    console.log(
      `Starting benchmarks. Queued: ${progress.queued.length} Filtered: ${progress.filtered}`,
    );
    return;
  }

  // Starting bench run
  if (progress.running && progress.running.measuredRunsMs.length == 0) {
    console.log(
      `Start running ${progress.running.name} a total of ${progress.running.runsCount} times`,
    );
    return;
  }

  // Multiple run bench partial result
  if (progress.running) {
    console.log(
      `${progress.running.name} run of ${progress.running.measuredRunsMs.length}/${progress.running.runsCount} resulted in: ${
        progress.running
          .measuredRunsMs[progress.running.measuredRunsMs.length - 1]
      } ms`,
    );
    return;
  }

  // Bench run result
  if (
    progress.queued.length != 0 && !progress.running &&
    progress.results.length != 0
  ) {
    const result = [...progress.results].reverse()[0];
    console.log(
      `Finished running ${result.name} with runCount: ${result.runsCount ||
        1}, a total of ${result.totalMs} ms` +
        (!!result.measuredRunsAvgMs
          ? ` and average run of ${result.measuredRunsAvgMs} ms`
          : ""),
    );
    return;
  }
}
