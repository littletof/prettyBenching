import { disjunct, intersect, stripColor } from "./common.ts";
import { lDiff, matchWithIndex, padEndVisible } from "./utils.ts";

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

type colorFunction = (str: string) => string;

interface charset {
  start: string;
  stop: string;
  line: string;
  is: string;
}

export class TableBuilder {
  width: number;
  lines: string[] = [];
  colorFn: colorFunction;
  tempColorFn: colorFunction;

  constructor(width: number, colorFn: colorFunction) {
    this.width = width;
    this.colorFn = this.tempColorFn = colorFn;
  }

  line(line: string) {
    this.lines.push(this.tableLine(line));
    return this;
  }

  cellLine(...cells: string[]) {
    if (cells.length == 1) {
      cells.push("");
    }
    this.lines.push(this.tableLine(cells.join(this.tempColorFn(chars.middle))));
    this.tempColorFn = this.colorFn;
    return this;
  }

  separator() {
    this.lines.push(separatorToken);
    return this;
  }

  color(colorFn: colorFunction) {
    this.colorFn = this.tempColorFn = colorFn;
    return this;
  }

  tc(colorFn: colorFunction) { // TODO reconsider
    this.tempColorFn = colorFn;
    return this;
  }

  build() {
    let result = "";
    result += this.getHSeparator(undefined, this.lines[0]);
    this.lines.forEach((l, i, a) => {
      if (l === separatorToken) {
        if (i === a.length - 1) { // last line is separator token, remove it so table end connects properly
          this.lines.splice(i, 1);
          return;
        }
        result += this.getHSeparator(this.lines[i - 1], this.lines[i + 1]);
        return;
      }
      result += l;
    });
    result += this.getHSeparator(this.lines[this.lines.length - 1], undefined);
    return result;
  }

  private getHSeparator(topLine?: string, bottomLine?: string) {
    const topc = topLine
      ? this.getWSeparatorPositions(stripColor(topLine))
      : [];
    const bottomc = bottomLine
      ? this.getWSeparatorPositions(stripColor(bottomLine))
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
      !this.isCap(ind) && crosses.push({ i: ind, t: chars.midmid })
    );
    topd.forEach((ind: number) =>
      !this.isCap(ind) && crosses.push({ i: ind, t: chars.bottommid })
    );
    bottomd.forEach((ind: number) =>
      !this.isCap(ind) && crosses.push({ i: ind, t: chars.topmid })
    );

    return this.tableLine(undefined, crosses, lineBase);
  }

  private tableLine(
    content?: string,
    crosses?: { i: number; t: chars }[],
    chars: charset = tableLinecharset(),
  ) {
    const line = padEndVisible(
      `${this.colorFn(chars.start)}${content ||
        this.colorFn(chars.line.repeat(this.width))}`,
      this.width + 1,
    ) + `${this.colorFn(chars.stop)}\n`;
    const lineArray = line.split("");
    if (crosses) {
      crosses.forEach(({ i, t }) => {
        const colDiff = lDiff(line.substr(0, i));
        lineArray.splice(i + colDiff, 1, t);
      });
    }
    return lineArray.join("");
  }

  private isCap(index: number) {
    return (index == 0 || index == this.width + 1);
  }

  private getWSeparatorPositions(line: string) {
    /* stash 
    return matchWithIndex(line, /│/g).map(i => {
      return i - lDiff(line.slice(0, i));
    }); */
    return matchWithIndex(line, /│/g);
  }
}

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
