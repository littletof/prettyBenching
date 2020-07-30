import { colors } from "./deps.ts";

export class Colorer {
  doColor = true;

  setColorEnabled(to: boolean) {
    this.doColor = to;
  }

  black = (str: string) => this.color(str, colors.black);
  blue = (str: string) => this.color(str, colors.blue);
  cyan = (str: string) => this.color(str, colors.cyan);
  gray = (str: string) => this.color(str, colors.gray);
  green = (str: string) => this.color(str, colors.green);
  magenta = (str: string) => this.color(str, colors.magenta);
  red = (str: string) => this.color(str, colors.red);
  white = (str: string) => this.color(str, colors.white);
  yellow = (str: string) => this.color(str, colors.yellow);

  private color(str: string, colorFn: (str: string) => string): string {
    return this.doColor ? colorFn(str) : str;
  }
}
