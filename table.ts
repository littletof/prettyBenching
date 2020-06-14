import { Colorer } from "./colorer.ts";
import {
  padEndVisible,
  lDiff,
  matchWithIndex,
  intersect,
  stripColor,
  disjunct,
} from "./utils.ts";

const c = new Colorer();
const separatorToken = "#&imaseparator&#";

enum chars {
  top = "─",
  topmid = "┬",
  topleft = "┌",
  topright = "┐",
  bottom = "─",
  bottommid = "┴",
  bottomleft = "└",
  bottomright = "┘",
  left = "│",
  midleft = "├",
  mid = "─",
  midmid = "┼",
  right = "│",
  midright = "┤",
  middle = "│",
}

interface charset {
  start: string;
  stop: string;
  line: string;
  is: string;
}

export class TableBuilder {
  width: number;
  lines: string[] = [];
  colorFn = c.green;

  constructor(width: number) {
    this.width = width;
  }

  line(line: string) {
    this.lines.push(line);
    return this;
  }

  separator() {
    this.lines.push(separatorToken);
    return this;
  }

  color(colorFn: (str: string) => string) {
    this.colorFn = colorFn;
    return this;
  }

  build() {
    let result = "";
    result += getHSeparator(undefined, this.lines[0]);
    this.lines.forEach((l, i) => {
      if (l === separatorToken) {
        result += getHSeparator(this.lines[i - 1], this.lines[i + 1]);
        return;
      }
      result += l + "\n";
    });
    result += getHSeparator(this.lines[this.lines.length - 1], undefined);
    return result;
  }
}

const basecharset = () => ({ start: "+", stop: "+", line: "-", is: "+" });
const bottomcharset = () => ({
  start: chars.bottomleft,
  stop: chars.bottomright,
  line: chars.bottom,
  is: chars.bottommid,
});
const topcharset = () => ({
  start: chars.topleft,
  stop: chars.topright,
  line: chars.top,
  is: chars.topmid,
});
const middlecharset = () => ({
  start: chars.midleft,
  stop: chars.midright,
  line: chars.mid,
  is: chars.midmid,
});
const tableLinecharset = () => ({
  start: chars.left,
  stop: chars.right,
  line: chars.mid,
  is: chars.midmid,
});

console.log(
  getHSeparator(
    undefined,
    "│    Total runs: 2      │  Total time: 0.0527 ms    │  -   Avg time: 0.0263 ms              │",
  ),
);

console.log(
  new TableBuilder(91)
    .line(
      "│    Benchmark name: finished                          │                                    │",
    )
    .separator()
    .line(
      "│    Total runs: 2      │  Total time: 0.0527 ms       │   Avg time: 0.0263 ms              │",
    )
    .separator()
    .line(
      "│                            │                                                              │",
    )
    .line(
      "│ 0.3284 ms _[     1][   1%] │ =                                                            │",
    )
    .line(
      "│ 0.6995 ms _[    96][  96%] │ ===========================================================  │",
    )
    .line(
      "│ 1.0706 ms _[     1][   1%] │ =                                                            │",
    )
    .line(
      "│ 1.4417 ms _[     0][   0%] │                                                              │",
    )
    .line(
      "│ 1.8128 ms _[     2][   2%] │ ==                                                           │",
    )
    .line(
      "│                            │                                                              │",
    )
    .build(),
);

function padLength() {
  return prettyBenchmarkSeparator(basecharset()).length - 2; // todo width
}

function prettyBenchmarkSeparator(
  caps: charset = basecharset(),
) {
  return `${caps.start}${caps.line.repeat(91)}${caps.stop}`; // todo width
}

function getHSeparator(topLine?: string, bottomLine?: string) {
  const topc = topLine ? getWSeparatorPositions(stripColor(topLine)) : [];
  const bottomc = bottomLine
    ? getWSeparatorPositions(stripColor(bottomLine))
    : [];
  const inter = intersect(topc, bottomc) as number[];
  const topd = disjunct(topc, inter) as number[];
  const bottomd = disjunct(bottomc, inter) as number[];

  let lineBase = middlecharset();

  if (topc.length == 0) {
    lineBase = topcharset();
  } else if (bottomc.length == 0) {
    lineBase = bottomcharset();
  }

  const crosses: { i: number; t: chars }[] = [];
  inter.forEach((ind: number) =>
    (ind != 0 && ind != 92) && crosses.push({ i: ind, t: chars.midmid })
  ); // TODO 92 = width
  topd.forEach((ind: number) =>
    (ind != 0 && ind != 92) && crosses.push({ i: ind, t: chars.bottommid })
  );
  bottomd.forEach((ind: number) =>
    (ind != 0 && ind != 92) && crosses.push({ i: ind, t: chars.topmid })
  );

  // console.log(tableLine(undefined, crosses, lineBase));
  // console.log(topd, bottomd, inter);
  return tableLine(undefined, crosses, lineBase);
}

function getWSeparatorPositions(line: string) {
  const regexp = /│/g;
  return matchWithIndex(line, regexp);
}

function tableLine(
  content?: string,
  crosses?: { i: number; t: chars }[],
  chars: charset = tableLinecharset(),
) {
  const line = padEndVisible(
    `${c.green(chars.start)}${content ||
      c.green(chars.line.repeat(padLength()))}`,
    padLength() + 1,
  ) + `${c.green(chars.stop)}\n`;
  const lineArray = line.split("");
  if (crosses) {
    crosses.forEach(({ i, t }) => {
      const colDiff = lDiff(line.substr(0, i));
      lineArray.splice(i + colDiff, 1, t);
    });
  }
  return lineArray.join("");
}
