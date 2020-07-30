import { BenchmarkResult } from "./deps.ts";
import { stripColor } from "./common.ts";

export function getTimePadSize() {
  return 12; // TODO
}

export function getTimePrecision() {
  return usingHrTime() ? 4 : 0;
}

export function usingHrTime(): boolean {
  // would need unstable for Deno.permissions.query({name: "hrtime"});
  return isFloat(performance.now());
}

export function isFloat(num: number) {
  return num % 1 !== 0;
}

export function padEndVisible(str: string, to: number, char = " ") {
  return str.padEnd(to + lDiff(str), char);
}

export function padStartVisible(str: string, to: number, char = " ") {
  return str.padStart(to + lDiff(str), char);
}

export function num(num: number, force?: boolean) {
  return isFloat(num) || force ? num.toFixed(4) : `${num}`;
}

export function perc(num: number) {
  return (num % 1 !== 0 && num < 99.9995) ? num.toFixed(1) : num.toFixed();
}

export function rtime(num: number, from = 0) {
  const log = Math.max(Math.floor(Math.log10(num)), 0);
  const defPrec = isFloat(num) ? 4 : 0;
  return num.toFixed(Math.max(defPrec - Math.max(log - from, 0), 0));
}

export function lDiff(str: string) {
  const escaped = stripColor(str);
  return str.length - escaped.length;
}

/** returns an array, that contains each index where the regexp mathes the string */
export function matchWithIndex(line: string, regexp: RegExp) {
  const indexes = [];
  let match;
  while ((match = regexp.exec(line)) != null) {
    indexes.push(match.index);
  }
  return indexes;
}
