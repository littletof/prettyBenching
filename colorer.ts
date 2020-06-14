import { colors } from "./deps.ts";

export class Colorer {
  doColor: boolean = true;

  setColorEnabled(to: boolean) {
    this.doColor = to;
  }

  cyan = (str: string) => this.color(str, colors.cyan);
  blue = (str: string) => this.color(str, colors.blue);
  green = (str: string) => this.color(str, colors.green);
  yellow = (str: string) => this.color(str, colors.yellow);
  gray = (str: string) => this.color(str, colors.gray);
  red = (str: string) => this.color(str, colors.red);
  white = (str: string) => this.color(str, colors.white);

  private color(str: string, colorFn: (str: string) => string): string {
    return !!this.doColor ? colorFn(str) : str;
  }
}
