import { BenchmarkResult, colors } from "./deps.ts";
import { rtime } from "./utils.ts";
import { stripColor } from "./common.ts";

import type { prettyBenchmarkProgressOptions } from "./pretty_benchmark_progress.ts";
import type { prettyBenchmarkResultOptions } from "./pretty_benchmark_result.ts";
import type { ColumnDefinition } from "./pretty_benchmark_down.ts";
import type { prettyBenchmarkHistory, DeltaKey } from "./pretty_benchmark_history.ts";


export function deltaProgressRowExtra(history: prettyBenchmarkHistory) {
    return (result: BenchmarkResult, options?: prettyBenchmarkProgressOptions) => {
        let deltaString = getCliDeltaString(history, result);

        if(options?.nocolor) {
            deltaString = stripColor(deltaString);
        }

        return ` [${deltaString}]`;
    };
}

export function deltaResultInfoCell(history: prettyBenchmarkHistory) {
    return (result: BenchmarkResult, options?: prettyBenchmarkResultOptions) => {
        let deltaString = getCliDeltaString(history, result);

        if(options?.nocolor) {
            deltaString = stripColor(deltaString);
        }

        return `  ${deltaString}`;
    };
}

function getCliDeltaString(history: prettyBenchmarkHistory, result: BenchmarkResult) {
    const delta = history.getDeltaForBenchmark(result);
    let deltaString = `${colors.gray(" ▪   no history  ▪ ".padEnd(19))}`;
    if(delta) {
        const perc = (delta.measuredRunsAvgMs.percent * 100).toFixed(0);
        const diff = rtime(Math.abs(delta.measuredRunsAvgMs.amount));
        
        if(delta.measuredRunsAvgMs.amount > 0) {
            deltaString = `${colors.red(` ▲ ${`+${perc}`.padStart(4)}% (${diff.padStart(6)}ms)`)}`;
        } else {
            deltaString = `${colors.green(` ▼ ${perc.padStart(4)}% (${diff.padStart(6)}ms)`)}`;
        }
    }

    return deltaString;
}

export function deltaColumn<T = unknown>(history: prettyBenchmarkHistory<T>, options?: {key: DeltaKey<T>}): ColumnDefinition {
    const workingKey = options?.key || "measuredRunsAvgMs";

    return {title: `Change in ${options?.key || "average"}`, formatter: (result, cd) => {
        const delta = history.getDeltaForBenchmark(result, [workingKey]);
        if(delta) {
            const perc = (delta[workingKey as string].percent * 100).toFixed(0);
            const diff = rtime(Math.abs(delta.measuredRunsAvgMs.amount));
            
            const notSpaceChar = " ";
            const smallSpace = " "; 
            if(delta[workingKey as string].amount > 0) {
                return `🔺 ${`+${perc}`.padStart(4,notSpaceChar)}% (${diff.padStart(6)}ms)`;
            } else {
                return `🟢${smallSpace} ${perc.padStart(4, notSpaceChar)}% (${diff.padStart(6)}ms)`;
            }
        }
        return "-";
    }};
}

export function historyColumns<T = unknown>(history: prettyBenchmarkHistory<T>, options?: {key?: DeltaKey<T>, titleFormatter?: (date: Date, id?: string) => string}): ColumnDefinition[] {
    if(history.getData().history.length === 0){
        return [];
    }

    const dateFormatter = (d: Date) => {
        return d.toISOString().split("T").join('<br/>').replace(/Z/, "");
    };

    return history.getData().history.map(run => {        
        const parsedDate = new Date(run.date);
        return {
            title: (typeof options?.titleFormatter === "function" ? options.titleFormatter(parsedDate, run.id) : run.id ?? dateFormatter(parsedDate)),
            toFixed: 4,
            formatter: (result: BenchmarkResult) => {
                if(!run.benchmarks[result.name]) {
                    return "-";
                }

                const workingKey = options?.key ?? "measuredRunsAvgMs";

                if(workingKey === "measuredRunsAvgMs" || workingKey === "totalMs") {
                    return (run.benchmarks[result.name] as any)[workingKey as any] || "-";
                } else {
                    return run.benchmarks[result.name].extras?.[workingKey] || "-";
                }
            }
        };
    });
}