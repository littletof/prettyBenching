import { runBenchmarks, BenchmarkResult, BenchmarkRunResult, bench, BenchmarkRunProgress } from "https://deno.land/std@0.67.0/testing/bench.ts";
import { prettyBenchmarkProgress } from "./pretty_benchmark_progress.ts";
import { prettyBenchmarkResult } from "./pretty_benchmark_result.ts";
import { prettyBenchmarkDown, ColumnDefinition } from "./pretty_benchmark_down.ts";
import { colors } from "./deps.ts";

export interface prettyBenchmarkHistoricOptions {
    strict?: boolean,
    onlyHrTime?: boolean,
    extra?: (result: BenchmarkResult) => unknown // T here precalc and save extra metrics
    saveIndividualRuns?: boolean;
    minRequiredRuns?: number; // error if run below x
    // save precalced -> inside extra
}

export class prettyBenchmarkHistoric { // only work with JSON no file handling
    
    private historicData?: historicData;
    private options?: prettyBenchmarkHistoricOptions;
    
    constructor(options?: prettyBenchmarkHistoricOptions, prev?: historicData) {
        this.options = options;

        if(prev) {
            this.load(prev);
        } else {
            this.init();
        }
    }
    
    private init() {
        this.historicData = { benchmarks: {} };
    }

    private load(prev: historicData) {
        //TODO contruct dates
        this.historicData = prev;
    } 

    addResults(measured: BenchmarkRunResult, options?: {id?: string}){

        const date = new Date();

        // TODO if same name twice -> error

        measured.results.forEach(r => {
            
            if(!this.historicData!.benchmarks[r.name]) {
                this.historicData!.benchmarks[r.name] = {
                    name: r.name,
                    history: []
                }
            }

            this.historicData!.benchmarks[r.name].history.push({
                id: options?.id,
                date,
                measuredRunsAvgMs: r.measuredRunsAvgMs,
                totalMs: r.totalMs,
                runsCount: r.runsCount,
                measuredRunsMs: this.options?.saveIndividualRuns ? r.measuredRunsMs : undefined 
            })
        });

        return this;
    }

    getDeltasFrom(results: BenchmarkRunResult): {[key: string]: delta} {

        const deltas: {[key: string]: delta} = {};

        results.results.forEach(r => {
            const d = this.getDeltaForSingle(r);
            if(d){
                deltas[r.name] = d;
            }
        });

        return deltas;
    }

    getDeltaForSingle(result: BenchmarkResult, key?: string): delta | false {
        // error if key not in results
        // error / nodelta if key is not in historic

       /*  if(!results.results.some(r => r.name === name)) {
            throw new Error(`No benchmark named ${name} was in results`);
        } */

        if(!this.historicData?.benchmarks[result.name]) {
            // throw new Error(`No benchmark is known named ${name}`);
            return false; // no prev history for this benchmark
        }

        const benchmark = this.historicData.benchmarks[result.name];
        const prev = benchmark.history[benchmark.history.length-1];
        const current = result;

        if(key && key !== "measuredRunsAvgMs" && !(prev.extra as any)?.[key]) {
            throw new Error("No key like that"); // TODO this is bad, because current wont have extra, nothing to check against
        }

        if(!key) {
            const diff = current.measuredRunsAvgMs - prev.measuredRunsAvgMs;
            const percDiff = diff / prev.measuredRunsAvgMs;

            // console.log(prev.measuredRunsAvgMs, current.measuredRunsAvgMs, diff);

            return {
                measuredRunsAvgMs: {percent: percDiff, ms: diff}
            }
        } else {
            return false;  // TODO handle from extra
        }

    }

    getData() { // return json
        // TODO deepCopy
        return this.historicData;
    }

    getThresholds() {
        // return green below alltime avgs min
        // return yellow above alltime avgs max + x perc.
        // return none is 0/1/x preceeding historic
    }
}
// error if same name multiple times in 1 run.

export interface historicData {
    benchmarks: {
        [key: string]: {
            name: string;
            history: {
                id?: string; // to identify specific run
                extra?: unknown; // T
                date: Date;

                measuredRunsAvgMs: number;
                totalMs: number;
                runsCount: number;
                measuredRunsMs?: number[];
            }[]
        }
    },
    lastBenchmark?: Date;
}

export interface delta {
    measuredRunsAvgMs: {percent: number, ms: number}
    [key: string]: {percent: number, ms: number} // if can find key in extra calc for it. getDeltaForSingle
}

function historicColumn(historic: prettyBenchmarkHistoric, options?: {key: string}): ColumnDefinition {
    return {title: "Change", formatter: (result, cd) => {
        const delta = historic.getDeltaForSingle(result);
        if(delta) {
            const perc = (delta.measuredRunsAvgMs.percent * 100).toFixed(0);
            const diff = (Math.abs(delta.measuredRunsAvgMs.ms)).toFixed(2);
            
            if(delta.measuredRunsAvgMs.ms > 0) {
                return `🔺 +${perc}% (${diff}ms)`;
            } else {
                return `🟢 ${perc}% (${diff}ms)`;
            }
        }
        return "";
    }};
}

function historicRow(historic: prettyBenchmarkHistoric, options?: {key: string}): ColumnDefinition[] {
    const benchmarks = historic.getData()?.benchmarks;
    if(benchmarks) {
        const dates: {[key: string]: {benches: {[key: string]: any}, id?: string}} = {};
        Object.keys(benchmarks).forEach(k => {
            const bench = benchmarks[k];

            bench.history.forEach(h => {
                if(!dates[new Date(h.date).toString()]) {
                    dates[new Date(h.date).toString()] = {benches: {}, id: h.id};
                }

                dates[new Date(h.date).toString()].benches[bench.name] = {
                    avg: h.measuredRunsAvgMs, // TODO rename avg
                    name: bench.name
                };
            });
            // group them based on date
        });

        const gend: ColumnDefinition[] = Object.keys(dates).sort().map(k => {
            return {
                title: dates[k].id ?? new Date(k).toString(), // TODO handle invalid Dates
                formatter: (result: BenchmarkResult) => {
                    if(!dates[k].benches[result.name]) {
                        return '-';
                    }
                    return dates[k].benches[result.name].avg || "-";
                }
            }
        });

        gend.push({
            title: 'Current avg (ms)',
            propertyKey: 'measuredRunsAvgMs'
        });

        return gend;
    }
    
    return [];
}

function historicProgressExtra(historic: prettyBenchmarkHistoric) {
    return (result: BenchmarkResult) => {
        const delta = historic.getDeltaForSingle(result);
        if(delta) {
            const perc = (delta.measuredRunsAvgMs.percent * 100).toFixed(0);
            const diff = (Math.abs(delta.measuredRunsAvgMs.ms)).toFixed(2);
            
            if(delta.measuredRunsAvgMs.ms > 0) {
                return ` [${colors.red(` ▲ +${perc}% (${diff}ms)`)}]`;
            } else {
                return ` [${colors.green(` ▼ ${perc}% (${diff}ms)`)}]`;
            }
        }
        return "";
    };
}

function example() {

    
    let prevString;
    try {
        prevString = JSON.parse(Deno.readTextFileSync('./benchmarks/historic.json'));
    } catch {
        console.warn('⚠ cant read file');
    }

    const historic = new prettyBenchmarkHistoric({ saveIndividualRuns: false }, prevString);

    // console.log(JSON.stringify(historic.getData()));


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

    runBenchmarks({silent: true}, prettyBenchmarkProgress({extra: historicProgressExtra(historic)}))
        // TODO defaultColumns to func, dont get avg, total, just name, maybe runs
        .then(prettyBenchmarkDown(md => {Deno.writeTextFileSync("./benchmarks/hmd.md", md)}, {columns: [{title: 'Name', propertyKey: 'name'}, ...historicRow(historic), historicColumn(historic)]})) // historicColumn
        .then((results: BenchmarkRunResult) => {
            // console.log(historic.getDeltasFrom(results));

            // Deno.writeTextFileSync("./benchmarks/historic.json", JSON.stringify(historic.addResults(results).getData()))
        });

    return;
     
    runBenchmarks({silent: true}, prettyBenchmarkProgress()) // into "extra"
        .then(prettyBenchmarkResult()) // to determine
        .then(prettyBenchmarkDown(console.log, {columns: [historicColumn(historic)]})) // historicColumn
        .then((results: BenchmarkRunResult) => {
            Deno.writeTextFileSync("./benchmarks/historic.json", JSON.stringify(historic.addResults(results).getData()))
        });
}

// deno run --allow-read --allow-write --allow-hrtime .\pretty_benchmark_historic.ts

example();