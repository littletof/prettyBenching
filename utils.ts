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
  return performance.now() % 1 !== 0;
}

export function padEndVisible(str: string, to: number, char: string = " ") {
  return str.padEnd(to + lDiff(str), char);
}

export function padStartVisible(str: string, to: number, char: string = " ") {
  return str.padStart(to + lDiff(str), char);
}

export function num(num: number, force?: boolean) {
  return usingHrTime() || force ? num.toFixed(4) : `${num}`;
}

export function perc(num: number) {
  return (num % 1 !== 0) ? num.toFixed(1) : `${num}`;
}

export function lDiff(str: string) {
  const escaped = str.replace(/\x1b\[[0-9\;]*m/g, "");
  return str.length - escaped.length;
}
