import { colors } from "./deps.ts";
import { padStartVisible } from "./utils.ts";
import type { BenchIndicator, Thresholds } from "./types.ts";
import type { BenchmarkResult, BenchmarkRunResult } from "./deps.ts";

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

/** Gets the correct indicator for the named bench */
export function getIndicator(
  name: string,
  indicators?: BenchIndicator[],
) {
  if (indicators && indicators.length > 0) {
    const indChar = "▒▒";
    const indicator = indicators.find(({ benches }) => benches.test(name));
    if (indicator) {
      if (typeof indicator.modFn == "function") {
        const modded = indicator.modFn(indChar);
        return modded; // str or object
      } else {
        return false; // has indicator but no modFn
      }
    }
  }

  return undefined;
}

/** Handles the padding of indicators to specific lengths */
export function getPaddedIndicator(
  name: string,
  toLength: number,
  indicators?: BenchIndicator[],
  noIndicator: string = " ".repeat(toLength),
) {
  const indicator = getIndicator(name, indicators);
  if (indicator) {
    let newIndicator = "";

    if (
      typeof indicator === "object" && indicator.indicator &&
      !isNaN(indicator.visibleLength)
    ) {
      newIndicator = padStartVisible(
        `${indicator.indicator}`,
        toLength +
          (stripColor(indicator.indicator).length - indicator.visibleLength),
      );
    } else { //simple string
      newIndicator = padStartVisible(`${indicator}`, toLength);
    }

    return newIndicator;
  }

  return noIndicator;
}

/** strips terminal color */
export function stripColor(str: string) {
  // deno-lint-ignore no-control-regex
  return str.replace(/\x1b\[[0-9\;]*m/g, "");
}

export function substrColored(str: string, length: number) {
  let visibleLength = 0;
  let cutStr = "";
  const sa = [...str];

  for (let i = 0; i < sa.length; i++) {
    const cs = sa[i];
    if (cs === "\x1b") {
      const colorMod = str.slice(i, sa.indexOf("m", i) + 1);
      cutStr += colorMod;

      i = sa.indexOf("m", i);
    } else {
      if (visibleLength < length) {
        cutStr += cs;
        visibleLength++;
      }
    }
  }

  return cutStr;
}

export function intersect(a: unknown[], b: unknown[]) {
  return a.filter((value) => -1 !== b.indexOf(value));
}

export function disjunct(base: unknown[], dis: unknown[]) {
  return base.filter((value) => -1 === dis.indexOf(value));
}

/** Calculates the `min`, `max`, `mean` (as (`max`+`min`)/2) and `median` from the `measuredRunsMs` array. */
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

/** Calculates the `standard deviation` from the `measuredRunsMs` array. */
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

/** Returns the range into which the benchmarks with had a threshold set fell. */
export function getThresholdResultsFrom(
  runResult: BenchmarkRunResult,
  thresholds: Thresholds,
) {
  const thResults: { [key: string]: "red" | "yellow" | "green" } = {};
  runResult.results.forEach((r) => {
    const t = thresholds[r.name];
    if (t) {
      thResults[r.name] = r.measuredRunsAvgMs > t.green
        ? (r.measuredRunsAvgMs > t.yellow ? "red" : "yellow")
        : "green";
    }
  });

  return thResults;
}
