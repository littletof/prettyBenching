import  { colors } from "./deps.ts";
const { cyan, green, yellow, gray, red } = colors;

export function getTimeColor(name: string, time: number, threshold?: any) {
  const th = threshold && threshold[name];
  if (!!th) {
    if (time <= th.green) return green;
    if (time <= th.yellow) return yellow;
    if (th.yellow < time) return red;
  }
  return yellow; // TODO make default color an option
}

export function getTimePadSize() {
  return 8 + getTimePrecision();
}

export function getTimePrecision() {
  return usingHrTime() ? 4 : 0;
}

export function usingHrTime(): boolean {
  // would need unstable for Deno.permissions.query({name: "hrtime"});
  return performance.now() % 1 !== 0;
}
