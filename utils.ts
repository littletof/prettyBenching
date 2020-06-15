import { colors } from "./deps.ts";
const { green, yellow, red, white } = colors;

export function getTimeColor(
  name: string,
  time: number,
  nocolor: boolean,
  threshold?: { [key: string]: { green: number; yellow: number } },
) {
  if (nocolor) return (str: string) => str;
  const th = threshold && threshold[name];
  if (!!th) {
    if (time <= th.green) return green;
    if (time <= th.yellow) return yellow;
    if (th.yellow < time) return red;
  }
  return yellow;
}

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

export function padEndVisible(str: string, to: number, char: string = " ") {
  return str.padEnd(to + lDiff(str), char);
}

export function padStartVisible(str: string, to: number, char: string = " ") {
  return str.padStart(to + lDiff(str), char);
}

export function num(num: number, force?: boolean) {
  return isFloat(num) || force ? num.toFixed(4) : `${num}`;
}

export function perc(num: number) {
  return (num % 1 !== 0 && num.toFixed() != '100') ? num.toFixed(1) : num.toFixed();
}

export function rtime(num: number, from: number = 0) {
  const log = Math.max(Math.floor(Math.log10(num)), 0);
  const defPrec = isFloat(num) ? 4 : 0;
  return num.toFixed(Math.max(defPrec - Math.max(log-from, 0), 0));
}

export function lDiff(str: string) {
  const escaped = stripColor(str);
  return str.length - escaped.length;
}

export function stripColor(str: string) {
  return str.replace(/\x1b\[[0-9\;]*m/g, "");
}

export function matchWithIndex(line: string, regexp: RegExp) {
  const indexes = [];
  let match;
  while ((match = regexp.exec(line)) != null) {
    indexes.push(match.index);
  }
  return indexes;
}

export function intersect(a: unknown[], b: unknown[]) {
  return a.filter((value) => -1 !== b.indexOf(value));
}

export function disjunct(base: unknown[], dis: unknown[]) {
  return base.filter((value) => -1 === dis.indexOf(value));
}
