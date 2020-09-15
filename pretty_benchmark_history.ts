import type { BenchmarkResult, BenchmarkRunResult } from "./deps.ts";
import type { Thresholds, Threshold } from "./types.ts";

/** Defines the rules on what and how the history should contain.
 *
 * @template T The type that is calculated with `benchExtras` function and stored in each benchmarks' `extras`.
 * @template K The type that is calculated with `runExtras` function and stored in each runs' `runExtras`.
 */
export interface prettyBenchmarkHistoryOptions<T = unknown, K = unknown> {
    /** Allow storing low precision measurements */
    easeOnlyHrTime?: boolean;
    /** Turns on strict mode. Setting it to boolean `true` gives the same result as setting each rule to `true` in the rules `object`.  */
    strict?: boolean | strictHistoryRules;
    /** Throw an error, when **any** benchmark has lower runsCount than the set value. */
    minRequiredRuns?: number;
    /** Saves each `measuredRunsMs` array for each benchmark. 
     * 
     * **WARNING** this could result in a very big history file overtime. 
     * 
     * Consider calculating necessary values before save instead with `benchExtras` or `runExtras`.*/
    saveIndividualRuns?: boolean;
    /** Saves the returned `object` for each benchmark into it's `extras` property. */
    benchExtras?: (result: BenchmarkResult) => T;
    /** Saves the returned `object` for each run into it's `runExtras` property. */
    runExtras?: (runResult: BenchmarkRunResult) => K;
}

/** Defines which strict rules to use. */
export type strictHistoryRules = {
    /** Throw an error, when previously saved benchmark is missing from the current set when calling `addResults`. Ignored on the very first set of benchmarks. */
    noRemoval?: boolean;
    /** Throw an error, when previously not saved benchmark is added to the current set when calling `addResults`. Ignored on the very first set of benchmarks. */
    noAddition?: boolean;
    /** Throw an error, when the `runsCount` changes for a benchmark from the previous run's `runsCount`. Ignored on new benchmarks. */
    noRunsCountChange?: boolean;
};

/** Represents the stored historic benchmark data 
 *
 * @template T The type that is calculated with `benchExtras` function and stored in each benchmarks' `extras`.
 * @template K The type that is calculated with `runExtras` function and stored in each runs' `runExtras`.
*/
export interface BenchmarkHistory<T = unknown, K = unknown> {
    /** The individual runs' values */
    history: BenchmarkHistoryItem<T, K>[];
}

/** Represents the results of one `runBenchmarks` run. 
 * 
 * @template T The type that is calculated with `benchExtras` function and stored in each benchmarks' `extras`.
 * @template K The type that is calculated with `runExtras` function and stored in each runs' `runExtras`.
*/
export interface BenchmarkHistoryItem<T = unknown, K = unknown> {
    /** The date of the measurement */
    date: string;
    /** User provided identifier for the run */
    id?: string;
    /** The object calculated by `runExtras` function if provided in the options */
    runExtras?: K;

    /** The individual benchmarks' results for the specific run.  */
    benchmarks: {
        [key: string]:  BenchmarkHistoryRunItem<T>;
    };
}

/** Represents the results of one benchmark's single run. 
 * 
 * @template T The type that is calculated with `benchExtras` function and stored in each benchmarks' `extras`.
 */
export interface BenchmarkHistoryRunItem<T = unknown> {
    /** The total time it took to run a given bechmark  */
    totalMs: number;
    /** Times the benchmark was run in succession. */
    runsCount: number;
    /** The average time of running the benchmark in milliseconds. */
    measuredRunsAvgMs: number;
    /** The individual measurements in milliseconds it took to run the benchmark.
     * 
     * Gets saved only, when `saveIndividualRuns` is set in the options. */
    measuredRunsMs?: number[];
    /** The object calculated by `benchExtras` function if provided in the options. */
    extras?: T;
}

/** Represent the change in a variables value. */
export interface Delta {
    /** The change in percents. */
    percent: number;
    /** The actual change */
    amount: number;
}

export type DeltaKey<T = unknown> = (keyof T | "measuredRunsAvgMs" | "totalMs");

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

                // TODO consider: checking changes in extras

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
            date: date.toString(),
            id: options?.id,
            runExtras: this.options?.runExtras &&this.options.runExtras(runResults),
            benchmarks: benchmarks,
        });

        this.data.history = this.data.history.sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

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

    getData(): BenchmarkHistory<T, K> {
        // no complex objects so should be enough
        return JSON.parse(JSON.stringify(this.data));
    }

    getDataString() {
        return JSON.stringify(this.getData(), null, 2);
    }

    getBenchmarkNames() {
        return [...new Set(this.data.history.map(h => Object.keys(h.benchmarks)).flat())];
    }
}

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