import {
  calculateExtraMetrics,
  calculateStdDeviation,
  getInThresholdRange,
  getPaddedIndicator,
  stripColor,
} from "./common.ts";
import type { BenchmarkResult, BenchmarkRunResult } from "./deps.ts";
import type { BenchIndicator, Thresholds } from "./types.ts";

/** Defines how the generated markdown should look like. */
export interface prettyBenchmarkDownOptions {
  /** Defines a `# title` for the markdown */
  title?: string;
  /** Defines a section right after the `title`. When a `function` is provided, it receives the run's results */
  description?: string | ((results: BenchmarkRunResult) => string);
  /** Defines a section at the end of the markdown. When a `function` is provided, it receives the run's results */
  afterTables?: string | ((results: BenchmarkRunResult) => string);
  /** Defines `groups`, into which the benchmarks will be groupped.
   * Any benchmark result, that wasn't added into any group will be collected into one table called `Ungroupped`.
   * One benchmark can be in multiple groups. */
  groups?: GroupDefinition[];
  /** Defines the columns of the markdown tables. */
  columns?: ColumnDefinition[];
}

/** Defines one column of the markdown table. */
export interface ColumnDefinition {
  /** Defines the title of the column */
  title: string;
  /** Defines which property of the `BenchmarkResult` should be displayed, if no `formatter` is defined.
   * 
   * *Note*: custom `propertyKey`-s can be used, but values has to be manually mapped onto each `BenchmarkResult`. */
  propertyKey?: string;
  /** Defines how the column should be aligned. Defaults to `center` */
  align?: "left" | "center" | "right";
  /** Calls `number.toFixed(x)` with this value, when defined and the cell value is a `number`.
   * 
   * Also used on `formatter` output values. */
  toFixed?: number;
  /** Allows to calculate custom cell values based on the `BenchmarkResult`, and its own `ColumnDefinition`.
   * 
   * The value will be `-` for falsy values, and `*` when no `propertyKey` and `formatter` was provided
   * 
   * Its favoured above `propertyKey`, when both is defined.*/
  formatter?: (result: BenchmarkResult, columnDef: ColumnDefinition) => string;
}

/** Defines a group in the markdown. */
export interface GroupDefinition {
  /** Collects the benchmarks into the group, which `name` mathes the `RegExp` */
  include: RegExp;
  /** Defines the name of the group, which will be a `## Title` in the markdown */
  name: string;
  /** Defines the columns of the markdown table in the specific group. Overrides root and default column options. */
  columns?: ColumnDefinition[];
  /** Defines a section right after the `group title`. When a `function` is provided, it receives the run's results 
   * for the benchmarks in the group, the group's definition and the overall benchmark results. */
  description?:
    | string
    | ((
      groupResults: BenchmarkResult[],
      group: GroupDefinition,
      runResults: BenchmarkRunResult,
    ) => string);
  /** Defines a section at the end of the `group`. When a `function` is provided, it receives the run's results 
   * for the benchmarks in the group, the group's definition and the overall benchmark results. */
  afterTable?:
    | string
    | ((
      groupResults: BenchmarkResult[],
      group: GroupDefinition,
      runResults: BenchmarkRunResult,
    ) => string);
}

/** Returns a function that expects a `BenchmarkRunResult`, which than prints 
 * the results in a nicely formatted `markdown`, based on the provided `options`.
 * 
 * Without `options`, one markdown table will be generated, containing all the bench results.
 * 
 * Typical basic usage:
 * 
 * ```ts
 * // add benches, then
 * runBenchmarks().then(prettyBenchmarkDown(console.log));
 * // or write to file
 * runBenchmarks().then(prettyBenchmarkDown((markdown: string) => { Deno.writeTextFileSync("./benchmark.md", markdown); });
 * ```
 * .
 */
export function prettyBenchmarkDown(
  /** Defines the output function which will be called with the generated string markdown output.*/
  outputFn: (out: string) => void,
  /** Defines how the output should look like */
  options?: prettyBenchmarkDownOptions,
) {
  return (result: BenchmarkRunResult) =>
    _prettyBenchmarkDown(result, outputFn, options);
}

function _prettyBenchmarkDown(
  runResult: BenchmarkRunResult,
  outputFn: (out: string) => void,
  options?: prettyBenchmarkDownOptions,
) {
  let markdown = "";

  if (options?.title) {
    markdown += `# ${options.title}\n\n`;
  }

  markdown += stringOrFunction(options?.description, runResult) + "\n";

  if (options?.groups && options.groups.length > 0) {
    const grouppedResults: {
      [key: string]: GroupDefinition & { items: BenchmarkResult[] };
    } = {};
    const unmatched: GroupDefinition & { items: BenchmarkResult[] } = {
      name: "Ungrouped benches",
      items: [],
      // deno-lint-ignore no-explicit-any
    } as any;

    runResult.results.forEach((r) => {
      let matched = false;
      options.groups?.forEach((g, i) => {
        if (r.name.match(g.include)) {
          const groupProp = `${g.name}_${i}`;

          if (!grouppedResults[groupProp]) {
            grouppedResults[groupProp] = { ...g, items: [] };
          }

          grouppedResults[groupProp].items.push(r);

          matched = true;
        }
      });

      if (!matched) {
        if (
          !unmatched.items.some((i: BenchmarkResult) =>
            i.name === r.name && i.totalMs === r.totalMs
          )
        ) {
          // if isnt already added, add to unmatched group
          unmatched.items.push(r);
        }
      }
    });

    grouppedResults[`${unmatched.name}_${options.groups.length}`] = unmatched;

    const optionsGroup = [...options.groups];
    if (unmatched.items.length > 0) {
      optionsGroup.push(unmatched);
    }

    optionsGroup.forEach((g, i) => { // to keep order works from options.
      markdown += `## ${g.name}\n\n`;

      const resultGroup = grouppedResults[`${g.name}_${i}`];

      markdown += stringOrFunction(
        g.description,
        resultGroup?.items || [],
        g,
        runResult,
      );

      if (resultGroup) {
        markdown += headerRow(options, g);
        resultGroup.items.forEach((r: BenchmarkResult) => {
          markdown += tableRow(r, options, g);
        });
      } else {
        markdown += "> No benchmarks in this group.\n";
      }

      markdown += "\n";

      markdown += stringOrFunction(
        g.afterTable,
        resultGroup?.items || [],
        g,
        runResult,
      ) + "\n";
    });
  } else {
    markdown += headerRow(options);
    runResult.results.forEach((r) => {
      markdown += tableRow(r, options);
    });
    markdown += "\n";
  }

  markdown += stringOrFunction(options?.afterTables, runResult) + "\n";

  outputFn(markdown);

  return runResult;
}

const defaultColumnsArray: ColumnDefinition[] = [
  { title: "Name", propertyKey: "name", align: "left" },
  { title: "Runs", propertyKey: "runsCount", align: "right" },
  { title: "Total (ms)", propertyKey: "totalMs", align: "right", toFixed: 3 },
  {
    title: "Average (ms)",
    propertyKey: "measuredRunsAvgMs",
    align: "right",
    toFixed: 3,
  },
];

/** Defines the default `ColumnDefinitions`, which are `Name`, `Runs`, `Total (ms)` and `Average (ms)` */
export function defaultColumns(
  columns?: ("name" | "runsCount" | "totalMs" | "measuredRunsAvgMs")[],
): ColumnDefinition[] {
  if (columns) {
    return [...defaultColumnsArray].filter((dc) =>
      (columns as string[]).indexOf(dc.propertyKey!) !== -1
    );
  } else {
    return [...defaultColumnsArray];
  }
}

/** Defines a column which contains the indicators for the benchmarks, where provided.
 * 
 * *Note*: colors are stripped from the indicators in markdown */
export function indicatorColumn(
  indicators: BenchIndicator[],
): ColumnDefinition {
  return {
    title: "",
    formatter: (result: BenchmarkResult, cd: ColumnDefinition) => {
      return stripColor(getPaddedIndicator(result.name, 0, indicators));
    },
  };
}

/** Defines a threshold result column, which shows into which range the benchmark fell. Shows `-` when no `Threshold` was provided for the given benchmark. */
export function thresholdResultColumn(thresholds: Thresholds) {
  return {
    title: "",
    formatter: (result: BenchmarkResult, cd: ColumnDefinition) => {
      const inRange = getInThresholdRange(
        result.name,
        result.measuredRunsAvgMs,
        thresholds,
      );

      return ["-", "✅", "🔶", "🔴"][inRange || 0];
    },
  };
}

/** Defines a threshold result column, which shows the threshold ranges for the benchmark. Shows `-` when no `Threshold` was provided for the given benchmark.
 * 
 * If `indicateResult` is set, it shows in the same cell into which range the benchmark fell.*/
export function thresholdsColumn(
  thresholds: Thresholds,
  indicateResult?: boolean,
) {
  return {
    title: "Thresholds",
    align: "right",
    formatter: (result: BenchmarkResult, cd: ColumnDefinition) => {
      let value = "<small>";
      const inRange = getInThresholdRange(
        result.name,
        result.measuredRunsAvgMs,
        thresholds,
      );
      const th = thresholds && thresholds[result.name];

      if (!th) {
        return "-";
      }

      const indicator = " 🠴";
      const placeholder = " ";

      value += `<= ${th.green} ✅` +
        (indicateResult ? (inRange === 1 ? indicator : placeholder) : "") +
        "<br>";
      value += `<= ${th.yellow} 🔶` +
        (indicateResult ? (inRange === 2 ? indicator : placeholder) : "") +
        "<br>";
      value += ` > ${th.yellow} 🔴` +
        (indicateResult ? (inRange === 3 ? indicator : placeholder) : "");

      value += "</small>";

      return value;
    },
  };
}

/** Defines **multiple** columns, which contain extra calculated values, like `max`, `min`, `mean`, `median`, `stdDeviation`. 
 * 
 * Can be used like:
 * ```ts
 * columns: [...extraMetricsColumns()]
 * ```
 * . */
export function extraMetricsColumns(
  options?: {
    /** Defines which metrics it should include */
    metrics?: ("max" | "min" | "mean" | "median" | "stdDeviation")[];
    /** If set, `-` will be placed into cells, where the benchmark was only run once. */
    ignoreSingleRuns?: boolean;
  },
): ColumnDefinition[] {
  const columns: ColumnDefinition[] = [];

  const selected = options?.metrics ||
    ["min", "max", "mean", "median", "stdDeviation"];

  selected.forEach((s) => {
    if (s === "stdDeviation") {
      columns.push({
        title: "Std deviation",
        align: "right",
        toFixed: 3,
        formatter: (result: BenchmarkResult, cd: ColumnDefinition) => {
          if (options?.ignoreSingleRuns && result.runsCount === 1) {
            return "-";
          }

          const calced = calculateStdDeviation(result);
          return `${calced}`;
        },
      });
    } else {
      columns.push({
        title: s.charAt(0).toUpperCase() + s.slice(1), // capitalise
        align: "right",
        toFixed: 3,
        formatter: (result: BenchmarkResult, cd: ColumnDefinition) => {
          if (options?.ignoreSingleRuns && result.runsCount === 1) {
            return "-";
          }

          const calced = calculateExtraMetrics(result);
          return `${calced[s]}`;
        },
      });
    }
  });

  return columns;
}

function stringOrFunction(
  // deno-lint-ignore no-explicit-any
  value?: ((...params: any[]) => string) | string,
  // deno-lint-ignore no-explicit-any
  ...params: any[]
) {
  if (!value) {
    return "";
  }

  if (typeof value === "function") {
    return `${value(...params)}\n`;
  } else {
    return `${value}\n`;
  }
}

function headerRow(
  options?: prettyBenchmarkDownOptions,
  group?: GroupDefinition,
) {
  let titles = "|";
  let alignments = "|";

  const columns: ColumnDefinition[] = group?.columns || options?.columns ||
    defaultColumns();

  columns.forEach((c) => {
    titles += `${c.title}|`;
    alignments += `${alignment(c.align)}|`;
  });

  return `${titles}\n${alignments}\n`;
}

function tableRow(
  result: BenchmarkResult,
  options?: prettyBenchmarkDownOptions,
  group?: GroupDefinition,
) {
  let values = `|`;

  const columns: ColumnDefinition[] = group?.columns || options?.columns ||
    defaultColumns();

  columns.forEach((c) => {
    let value = null;
    if (typeof c.formatter === "function") {
      value = `${c.formatter(result, c)}`;
    } else {
      if (!c.propertyKey) {
        value = "*"; // this means no formatter function and no propertyKey was defined.
      } else {
        // deno-lint-ignore no-explicit-any
        const vc = (result as any)[c.propertyKey];
        value = typeof vc !== "undefined" ? vc : "-";
      }
    }

    if (!isNaN(parseFloat(value)) && !isNaN(c.toFixed!)) {
      value = parseFloat(value).toFixed(c.toFixed);
    }

    values += `${value}|`;
  });

  return `${values}\n`;
}

function alignment(mode?: "left" | "center" | "right") {
  if (mode === "right") {
    return "--:";
  }
  if (!mode || mode === "center") {
    return ":-:";
  }
  if (mode === "left") {
    return ":--";
  }
}
