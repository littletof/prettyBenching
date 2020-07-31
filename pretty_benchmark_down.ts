import { BenchmarkRunResult, BenchmarkResult } from "./deps.ts";
import { BenchIndicator, Thresholds } from "./types.ts";
import {
  stripColor,
  getInThresholdRange,
  getBenchIndicator,
  calculateExtraMetrics,
  calculateStdDeviation,
} from "./common.ts";

// TODO historic: better or worse by x percent to last value

export interface prettyBenchmarkDownOptions {
  title?: string;
  description?: string | ((results: BenchmarkRunResult) => string);
  afterTables?: string | ((results: BenchmarkRunResult) => string);
  groups?: GroupDefinition[];
  columns?: ColumnDefinition[];
}

export interface ColumnDefinition {
  title: string;
  propertyKey?: string;
  align?: "left" | "center" | "right";
  toFixed?: number;
  formatter?: (result: BenchmarkResult, columnDef: ColumnDefinition) => string;
}

export interface GroupDefinition {
  include: RegExp;
  name: string;
  columns?: ColumnDefinition[];
  description?:
    | string
    | ((
      groupResults: BenchmarkResult[],
      group: GroupDefinition,
      runResults: BenchmarkRunResult,
    ) => string);
  afterTable?:
    | string
    | ((
      groupResults: BenchmarkResult[],
      group: GroupDefinition,
      runResults: BenchmarkRunResult,
    ) => string);
}

export function prettyBenchmarkDown(
  outputFn: (out: string) => void,
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
    let grouppedResults: {
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
          const group_prop = `${g.name}_${i}`;

          if (!grouppedResults[group_prop]) {
            grouppedResults[group_prop] = { ...g, items: [] };
          }

          grouppedResults[group_prop].items.push(r);

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
        resultGroup?.items,
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
        resultGroup?.items,
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

export const defaultColumns: ColumnDefinition[] = [
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

export function indicatorColumn(
  indicators: BenchIndicator[],
): ColumnDefinition {
  return {
    title: "",
    formatter: (result: BenchmarkResult, cd: ColumnDefinition) => {
      return stripColor(getBenchIndicator(result.name, indicators));
    },
  };
}

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

export function extraMetricsColumns(
  options?: {
    metrics?: ("max" | "min" | "mean" | "median" | "stdDeviation")[];
    ignoreSingleRuns: boolean;
  },
): ColumnDefinition[] {
  const columns: ColumnDefinition[] = [];

  const selected = options?.metrics ||
    ["min", "max", "mean", "median", "stdDeviation"];

  selected.forEach((s) => {
    if (s === "stdDeviation") {
      columns.push({
        title: "std deviation",
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
        title: s,
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

/* TODO
export function historyColumn(){

}*/

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
    defaultColumns;

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
    defaultColumns;

  columns.forEach((c) => {
    let value = null;
    if (typeof c.formatter === "function") {
      value = `${c.formatter(result, c)}`;
    } else {
      if (!c.propertyKey) {
        value = "*"; // this means no formatter function and no propertyKey was defined.
      } else {
        // deno-lint-ignore no-explicit-any
        value = (result as any)[c.propertyKey] || "-";
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
