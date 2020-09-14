import { colors, BenchmarkResult } from "./deps.ts";
import type { Thresholds, BenchIndicator } from "./types.ts";

const { green, yellow, red, white } = colors;

export function getTimeColor(
  name: string,
  time: number,
  nocolor?: boolean,
  thresholds?: Thresholds,
) {
  // if nocolor is set, than return a the same string without coloring
  if (nocolor) {
    return (str: string) => str;
  }

  const inRange = getInThresholdRange(name, time, thresholds);

  return [yellow, green, yellow, red][inRange || 0];
}

export function getInThresholdRange(
  name: string,
  time: number,
  thresholds?: Thresholds,
): null | 1 | 2 | 3 {
  const th = thresholds && thresholds[name];

  if (th) {
    if (time <= th.green) return 1;
    if (time <= th.yellow) return 2;
    if (th.yellow < time) return 3;
  }
  return null;
}

export function getBenchIndicator(
  name: string,
  indicators?: BenchIndicator[],
) {
  if (indicators && indicators.length > 0) {
    const indChar = "#"; // TODO should be ▒ but doesnt work with stdout https://github.com/denoland/deno/issues/6001
    const indicator = indicators.find(({ benches }) => benches.test(name));
    return (!!indicator && typeof indicator.modFn == "function")
      ? indicator.modFn(indChar)
      : " "; // there are indicators defined, but not for this bench
  }

  return ""; // no indicators were defined
}

/** strips terminal color */
export function stripColor(str: string) {
  // deno-lint-ignore no-control-regex
  return str.replace(/\x1b\[[0-9\;]*m/g, "");
}

export function intersect(a: unknown[], b: unknown[]) {
  return a.filter((value) => -1 !== b.indexOf(value));
}

export function disjunct(base: unknown[], dis: unknown[]) {
  return base.filter((value) => -1 === dis.indexOf(value));
}

export function calculateExtraMetrics(result: BenchmarkResult) {
  const max = Math.max(...result.measuredRunsMs);
  const min = Math.min(...result.measuredRunsMs);
  const mean = (max + min) / 2; // not as avg

  const sorted = [...result.measuredRunsMs].sort();
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length == 0
    ? 0
    : (sorted.length % 2 !== 0 ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2);

  return {
    max,
    min,
    mean,
    median,
  };
}

export function calculateStdDeviation(result: BenchmarkResult) {
  const sorted = [...result.measuredRunsMs].sort();
  const stdDeviation = Math.sqrt(
    sorted.map((x) => Math.pow(x - result.measuredRunsAvgMs, 2)).reduce((
      a,
      b,
    ) => a + b) / sorted.length,
  );

  return stdDeviation;
}
