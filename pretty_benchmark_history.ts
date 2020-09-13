import { BenchmarkResult, BenchmarkRunResult, bench, runBenchmarks, colors } from "./deps.ts";
import { BenchIndicator } from "./types.ts";
import { prettyBenchmarkProgress, prettyBenchmarkProgressOptions } from "./pretty_benchmark_progress.ts";
import { prettyBenchmarkDown, ColumnDefinition } from "./pretty_benchmark_down.ts";
import { calculateExtraMetrics, calculateStdDeviation, stripColor } from "./common.ts";
import { rtime } from "./utils.ts";
import { prettyBenchmarkResult, prettyBenchmarkResultOptions } from "./pretty_benchmark_result.ts";

export interface prettyBenchmarkHistoryOptions<T = unknown, K = unknown> {
    runExtras?: (runResult: BenchmarkRunResult) => K;
    benchExtras?: (result: BenchmarkResult) => T;
    onlyHrTime?: boolean; // TODO to allowLowPrecisionTime
    strict?: boolean; // TODO separate into allowRemoval, allowRunsCountChange, allowNew
    minRequiredRuns?: number;
    saveIndividualRuns?: boolean;
}

export interface BenchmarkHistory/*?Data?*/<T = unknown, K = unknown> {
    history: BenchmarkHistoryItem<T, K>[];
}

// TODO name BenchmarkHistoryRunSet
export interface BenchmarkHistoryItem<T = unknown, K = unknown> {
    date: string;// Date; // TODO handle only strings?
    id?: string;
    runExtras?: K;

    benchmarks: {
        [key: string]:  BenchmarkHistoryRunItem<T>;
    };
}

export interface BenchmarkHistoryRunItem<T = unknown> {
    measuredRunsAvgMs: number;
    totalMs: number;
    runsCount: number;
    measuredRunsMs?: number[];
    extras?: T;
}

export interface Delta {
    percent: number;
    amount: number;
}

type DeltaKey<T = unknown> = (keyof T | "measuredRunsAvgMs" | "totalMs");

export class prettyBenchmarkHistory<T = unknown> {
    private data!: BenchmarkHistory<T>;
    private options?: prettyBenchmarkHistoryOptions<T>;

    constructor(options?: prettyBenchmarkHistoryOptions<T>, prev?: BenchmarkHistory<T>) {
        this.options = options;
 
        if(prev) {
            this.load(prev);
        } else {
            this.init();
        }
    }
    
    private init() {
        this.data = {history: []};
    }

    private load(prev: BenchmarkHistory<T>) {
        // TODO validate prev with options too?!
        this.data = prev;
    }

    addResults(runResults: BenchmarkRunResult, options?: {id?: string, date?: Date}) {
        const date = options?.date ?? new Date();

        // TODO checks

        const benchmarks: {[key: string]:  BenchmarkHistoryRunItem<T>} = {};
        runResults.results.forEach(r => {
            benchmarks[r.name] = {
                measuredRunsAvgMs: r.measuredRunsAvgMs,
                runsCount: r.runsCount,
                totalMs: r.totalMs,
                measuredRunsMs: this.options?.saveIndividualRuns ? r.measuredRunsMs : undefined,
                extras: this.options?.benchExtras && this.options.benchExtras(r)
            }
        });

        this.data.history.push({
            date: date.toString(), // TODO rethink if sotring as string is good
            id: options?.id,
            runExtras: this.options?.runExtras &&this.options.runExtras(runResults),
            benchmarks: benchmarks,
        });

        // TODO sort history again;

        return this;
    }

    getDeltasFrom(results: BenchmarkRunResult, keys: DeltaKey<T>[] = ["measuredRunsAvgMs", "totalMs"]): {[key: string]: {[key: string]: Delta}} {

        const deltas: {[key: string]: {[key:string]: Delta}} = {};

        results.results.forEach(r => {
            const d = this.getDeltaForBenchmark(r, keys);
            if(d){
                deltas[r.name] = d;
            }
        });

        return deltas;
    }

    getDeltaForBenchmark(result: BenchmarkResult, keys: DeltaKey<T>[] = ["measuredRunsAvgMs", "totalMs"]) {
        const prevResults = this.data.history.filter(h => h.benchmarks[result.name]);
        const lastResult = prevResults.length > 0 ? prevResults[prevResults.length-1].benchmarks[result.name] : undefined;

        if(!lastResult) { // no previous result for this benchmark
            return false;
        }

        const currentResultExtras = this.options?.benchExtras && this.options.benchExtras(result);

        // deno-lint-ignore no-explicit-any
        const calcDelta = (current: any, prev: any, key: any) => {
            if(typeof current[key] !== "number" || typeof prev[key] !== "number") {
                throw new Error(`Type of value selected by key "${key}" must be number`);
            }

            const diff = current[key] - prev[key];
            const percDiff = diff / prev[key];

            return {
                percent: percDiff,
                amount: diff
            }
        }

        const deltas: {[key:string]: Delta} = {};

        keys.forEach(key => {
            if(key === "measuredRunsAvgMs" || key === "totalMs") {
                deltas[key as string] = calcDelta(result, lastResult, key);
            } else {
                if(!currentResultExtras || typeof currentResultExtras[key] === undefined){ 
                    throw new Error(`No property named "${key}" in calculated extras for currently measured benchmark named "${result.name}".`);
                }
    
                if(!lastResult.extras || !lastResult.extras[key]) { // TODO consider throwing
                    return false;
                }
    
                deltas[key as string] = calcDelta(currentResultExtras, lastResult.extras, key);
            }
        });

        return deltas;
    }

    getData() {
        // TODO deep copy
        return this.data;
    }

    getDataString() {
        return JSON.stringify(this.getData(), null, 2);
    }
}

export function historicProgressExtra(history: prettyBenchmarkHistory) { // TODO fn name
    return (result: BenchmarkResult, options?: prettyBenchmarkProgressOptions) => {
        let deltaString = getCliDeltaString(history, result);

        if(options?.nocolor) {
            deltaString = stripColor(deltaString);
        }

        return ` [${deltaString}]`;
    };
}

export function historicResultExtra(history: prettyBenchmarkHistory) { // TODO fn name
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
    if(history.getData().history.length === 0){ // TODO naming is bad like this: history.getData().history
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

function example() {

    bench({
        name: "historic",
        func(b) {
            b.start();
            for (let i = 0; i < 1e3; i++) {
                const NPeP = Math.random() === Math.random();
            }
            b.stop();
        },
        runs: 500
    });

    bench({
        name: "x3#14",
        func(b) {
            b.start();
            for (let i = 0; i < 1e5; i++) {
                const NPeP = Math.random() === Math.random();
            }
            b.stop();
        },
        runs: 1000
    });
    bench({
        name: "MZ/X",
        func(b) {
            b.start();
            for (let i = 0; i < 1e5; i++) {
                const NPeP = Math.random() === Math.random();
            }
            b.stop();
        },
        runs: 1000
    });

    bench({
        name: "MZ/T",
        func(b) {
            b.start();
            for (let i = 0; i < 1e5; i++) {
                const NPeP = Math.random() === Math.random();
            }
            b.stop();
        },
        runs: 1000
    });
    
    let prevString;
    try {
        prevString = JSON.parse(Deno.readTextFileSync('./benchmarks/historicx.json'));
    } catch {
        console.warn('⚠ cant read file');
    }

    const history = new prettyBenchmarkHistory({ 
        saveIndividualRuns: false,
        minRequiredRuns: 100,
        onlyHrTime: true,
        strict: true,
        benchExtras: (r: BenchmarkResult) => ({r: r.name, ...calculateExtraMetrics(r), std: calculateStdDeviation(r)}),
        runExtras: (rr: BenchmarkRunResult) => ({dv: Deno.version, f: rr.filtered})
    }, prevString);

    // console.log(JSON.stringify(historic.getData()));

    const inds: BenchIndicator[] = [
        {benches: /historic/, modFn: _ => "👃"}
    ];

    runBenchmarks({silent: true}, prettyBenchmarkProgress({rowExtras: historicProgressExtra(history),indicators: inds, nocolor: false}))
        // TODO defaultColumns to func, dont get avg, total, just name, maybe runs
        .then(prettyBenchmarkDown(md => {Deno.writeTextFileSync("./benchmarks/hmdx.md", md)}, {columns: [{title: 'Name', propertyKey: 'name'}, ...historyColumns(history), {title: 'Average (ms)', propertyKey: 'measuredRunsAvgMs', toFixed: 4}, deltaColumn(history)]})) // historicColumn
        .then(prettyBenchmarkResult({infoCell: historicResultExtra(history)}))
        .then((results: BenchmarkRunResult) => {


            // console.log(historic.getDeltasFrom(results, "max"))
            history.addResults(results);
            // console.log(historic.getDataString());
            
            // console.log(historic.getDeltasFrom(results));
            
            // Deno.writeTextFileSync("./benchmarks/historicx.json", historic.getDataString());
        });

    return;
}

// deno run --allow-read --allow-write --allow-hrtime .\pretty_benchmark_historic.ts

example();