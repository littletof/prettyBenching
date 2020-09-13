import { BenchmarkResult, BenchmarkRunResult, bench, runBenchmarks, colors } from "./deps.ts";
import { calculateExtraMetrics, calculateStdDeviation, stripColor } from "./common.ts";
import { BenchIndicator, Thresholds, Threshold } from "./types.ts";
import { rtime } from "./utils.ts";
// TODO move these to separate file
import { prettyBenchmarkProgress, prettyBenchmarkProgressOptions } from "./pretty_benchmark_progress.ts";
import { prettyBenchmarkResult, prettyBenchmarkResultOptions } from "./pretty_benchmark_result.ts";
import { prettyBenchmarkDown, ColumnDefinition } from "./pretty_benchmark_down.ts";

export interface prettyBenchmarkHistoryOptions<T = unknown, K = unknown> {
    runExtras?: (runResult: BenchmarkRunResult) => K;
    benchExtras?: (result: BenchmarkResult) => T;
    easeOnlyHrTime?: boolean;
    strict?: boolean | strictHistoryRules;
    minRequiredRuns?: number;
    saveIndividualRuns?: boolean;
}

export type strictHistoryRules = { noRemoval?: boolean; noAddition?: boolean; noRunsCountChange?: boolean; };

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

export class prettyBenchmarkHistory<T = unknown, K=unknown> {
    private data!: BenchmarkHistory<T, K>;
    private options?: prettyBenchmarkHistoryOptions<T, K>;

    constructor(options?: prettyBenchmarkHistoryOptions<T, K>, prev?: BenchmarkHistory<T, K>) {
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

    private load(prev: BenchmarkHistory<T, K>) {
        // TODO consider validating prev with options too?!
        this.data = prev;
    }

    addResults(runResults: BenchmarkRunResult, options?: {id?: string, date?: Date}) {
        const date = options?.date ?? new Date();

        const duplicateNames = runResults.results.filter(r => runResults.results.filter(rc => rc.name === r.name).length > 1);
        if(duplicateNames.length !== 0) {
            throw new Error(`Names must be unique to be able to store them. Colliding names: [${[...new Set(duplicateNames.map(b => b.name)).values()].join(", ")}].`)
        }

        if(this.options?.minRequiredRuns){
            const notEnoughRuns = runResults.results.filter(r => r.runsCount < this.options?.minRequiredRuns! || r.measuredRunsMs.length < this.options?.minRequiredRuns!);
            if(notEnoughRuns.length !== 0) {
                throw new Error(`Minimum required runs (${this.options?.minRequiredRuns}) was not fullfilled by benchmarks: [${notEnoughRuns.map(r => `"${r.name}" (${r.runsCount})`).join(', ')}]. The minimum required runs can be set with 'minRequiredRuns' option.`);
            }
        }

        if(!this.options?.easeOnlyHrTime) {
            const isHrTime = (ms: number) => ms%1 !== 0;
            if(runResults.results.some(r => !isHrTime(r.totalMs))) {  // TODO consider: check on a subset of measurements too.
                throw new Error(`Seems like you are trying to add results, that were measured without the --allow-hrtime flag. You can bypass this check with the 'easeOnlyHrTime' option.`); // TODO proper msg
            }
        }

        if(this.options?.strict) {
            const strictIsBooleanTrue = typeof this.options?.strict === "boolean" && this.options?.strict;

            const hasDataAlready = Object.keys(this.data.history).length !== 0;
            if(hasDataAlready) { // strict has no effect on first set of results.
                const errors = [];

                const prevBenchmarks = this.getBenchmarkNames();

                prevBenchmarks.forEach(pb => {
                    const benchInResults = runResults.results.find(r => r.name === pb);
                    if(strictIsBooleanTrue || (this.options?.strict as strictHistoryRules).noRemoval){
                        if(!benchInResults) {
                            errors.push(`Missing benchmark named "${pb}" in current results. Set 'strict' or 'strict.noRemoval' option to false to bypass this check.`);
                        }
                    }

                    if(strictIsBooleanTrue || (this.options?.strict as strictHistoryRules).noRunsCountChange){
                        const prevRuns = this.data.history.filter(h => h.benchmarks[pb]);
                        if(benchInResults && prevRuns.length > 0) {
                            const lastRun = prevRuns.reverse()[0].benchmarks[pb];
                            if(lastRun.runsCount !== benchInResults.runsCount) {
                                errors.push(`Runs count of benchmark "${pb}" (${benchInResults.runsCount}) doesnt match the previous runs count (${lastRun.runsCount}). Set 'strict' or 'strict.noRunsCountChange' option to false to bypass this check.`);
                            }
                        }
                    }
                });

                if(strictIsBooleanTrue || (this.options?.strict as strictHistoryRules).noAddition){
                    const newBenches = runResults.results.filter(r => prevBenchmarks.indexOf(r.name) === -1);
                    if(newBenches.length !== 0) {
                        errors.push(`Adding new benches is not allowed after the initial set of benchmarks. New benches: [${newBenches.map(b => b.name)}]. Set 'strict' or 'strict.noAddition' option to false to bypass this check.`);
                    }
                }

                // TODO consider checking changes in extras

                if(errors.length !== 0) {
                    throw new Error(`Errors while trying to add new results to history: \n${errors.join("\n")}`);
                }
            }
        }

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

    getBenchmarkNames() {
        return [...new Set(this.data.history.map(h => Object.keys(h.benchmarks)).flat())];
    }
}

// TODO export calcStd, calcExtraMetrics

export function calculateThresholds<T, K>(history: prettyBenchmarkHistory<T, K>, options?: { minProceedingRuns?: number, calculate?: (runs: BenchmarkHistoryItem<T,K>[]) => Threshold}): Thresholds {
    const benchmarkNames = history.getBenchmarkNames();
    const data = history.getData();
    const thresholds: Thresholds = {};

    benchmarkNames.forEach(bn => {
        const runs = data.history.filter(h => h.benchmarks[bn])

        if(runs.length < (options?.minProceedingRuns ?? 5)) {
            return;
        }

        if(typeof options?.calculate === "function") {
            thresholds[bn] = options.calculate(runs);
        } else {
            const green = Math.min(...runs.map(r => r.benchmarks[bn].measuredRunsAvgMs)) * 1.1;
            const yellow = Math.max(...runs.map(r => r.benchmarks[bn].measuredRunsAvgMs)) * 1.3;
            
            thresholds[bn] = {green, yellow};
        }
    });

    return thresholds;
}

export function deltaProgressRowExtra(history: prettyBenchmarkHistory) { // TODO fn name
    return (result: BenchmarkResult, options?: prettyBenchmarkProgressOptions) => {
        let deltaString = getCliDeltaString(history, result);

        if(options?.nocolor) {
            deltaString = stripColor(deltaString);
        }

        return ` [${deltaString}]`;
    };
}

export function deltaResultInfoCell(history: prettyBenchmarkHistory) { // TODO fn name
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
        return d.toISOString().split("T").join('<br/>').replace(/Z/, ""); // TODO rework
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
        easeOnlyHrTime: false,
        strict: {noAddition: false, noRunsCountChange: false, noRemoval: false},
        benchExtras: (r: BenchmarkResult) => ({r: r.name, ...calculateExtraMetrics(r), std: calculateStdDeviation(r)}),
        runExtras: (rr: BenchmarkRunResult) => ({dv: Deno.version, f: rr.filtered})
    }, prevString);

    // console.log(JSON.stringify(historic.getData()));

    const inds: BenchIndicator[] = [
        {benches: /historic/, modFn: _ => "👃"}
    ];
    const thds = calculateThresholds(history);

    runBenchmarks({silent: true}, prettyBenchmarkProgress({rowExtras: deltaProgressRowExtra(history),indicators: inds, nocolor: false, thresholds: thds}))
        // TODO defaultColumns to func, dont get avg, total, just name, maybe runs
        .then(prettyBenchmarkDown(md => {Deno.writeTextFileSync("./benchmarks/hmdx.md", md)}, {columns: [{title: 'Name', propertyKey: 'name'}, ...historyColumns(history), {title: 'Average (ms)', propertyKey: 'measuredRunsAvgMs', toFixed: 4}, deltaColumn(history)]})) // historicColumn
        .then(prettyBenchmarkResult({infoCell: deltaResultInfoCell(history), nocolor: false, thresholds: thds, parts: {threshold: true, graph: true}}))
        .then((results: BenchmarkRunResult) => {


            // console.log(historic.getDeltasFrom(results, "max"))
            history.addResults(results);
            // console.log(history.getDataString());
            
            // console.log(historic.getDeltasFrom(results));
            
            // Deno.writeTextFileSync("./benchmarks/historicx.json", historic.getDataString());
        });

    return;
}

// deno run --allow-read --allow-write --allow-hrtime .\pretty_benchmark_historic.ts

example();