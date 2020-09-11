import { runBenchmarks, BenchmarkResult, BenchmarkRunResult, bench } from "https://deno.land/std@0.67.0/testing/bench.ts";
import { prettyBenchmarkProgress, prettyBenchmarkProgressOptions } from "./pretty_benchmark_progress.ts";
import { prettyBenchmarkResult } from "./pretty_benchmark_result.ts";
import { prettyBenchmarkDown, ColumnDefinition } from "./pretty_benchmark_down.ts";
import { colors } from "./deps.ts";
import { BenchIndicator } from "./types.ts";
import { stripColor } from "./common.ts";

export interface prettyBenchmarkHistoryOptions<T = unknown> {
    strict?: boolean, // error on runCount change, benchmark set change
    onlyHrTime?: boolean,
    extra?: (result: BenchmarkResult) => T // T here precalc and save extra metrics
    saveIndividualRuns?: boolean;
    minRequiredRuns?: number;
    // save precalced -> inside extra
}

export class prettyBenchmarkHistory<T = unknown> { // only work with JSON no file handling
    
    private historicBenchmarkData: historicBenchmarkData;
    private options?: prettyBenchmarkHistoryOptions<T>;
    
    constructor(options?: prettyBenchmarkHistoryOptions<T>, prev?: historicBenchmarkData) {
        this.options = options;

        this.historicBenchmarkData = { benchmarks: {} }; // TODO just so ? is not needed. fixit. 
        if(prev) {
            this.load(prev); // TODO validate prev with options too?!
        } else {
            this.init();
        }
    }
    
    private init() {
        this.historicBenchmarkData = { benchmarks: {} };
    }

    private load(prev: historicBenchmarkData) {
        //TODO contruct dates
        this.historicBenchmarkData = prev;
    } 

    addResults(measured: BenchmarkRunResult, options?: {id?: string}){
        const date = new Date();

        const duplicateNames = measured.results.filter(r => measured.results.filter(rc => rc.name === r.name).length > 1);
        if(duplicateNames.length !== 0) {
            throw new Error(`Multiple benchmarks with the same name: [${[...new Set(duplicateNames.map(b => b.name)).values()].join(", ")}]. Names must be unique.`)
        }

        if(this.options?.minRequiredRuns){
            const notEnoughRuns = measured.results.filter(r => r.runsCount < this.options?.minRequiredRuns! || r.measuredRunsMs.length < this.options?.minRequiredRuns!);
            if(notEnoughRuns.length !== 0) {
                throw new Error(`minRequiredRuns was set to ${this.options?.minRequiredRuns} runs in the options. [${notEnoughRuns.map(r => `"${r.name}" (${r.runsCount})`).join(', ')}] fails this.`);
            }
        }

        if(this.options?.onlyHrTime) {
            const isHrTime = (ms: number) => ms%1 !== 0;
            if(measured.results.some(r => !isHrTime(r.totalMs))) {  // TODO check on a subset of measurements too.
                throw new Error(`onlyHrTime was set to true. Seems like you are trying to add results, that were measured without the flag.`); // TODO proper msg
            }
        }

        if(this.options?.strict) {
            const hasDataAlready = Object.keys(this.historicBenchmarkData.benchmarks).length !== 0;
            if(hasDataAlready) { // strict has no effect on first set of results.
                const prevBenchmarks = Object.keys(this.historicBenchmarkData.benchmarks);
                prevBenchmarks.forEach(pb => { // TODO collect all, and throw that
                    const benchInNew = measured.results.find(r => r.name === pb);
                    if(!benchInNew) {
                        throw new Error(`Missing ${pb} benchmark in the new set, which is not allowed in strict mode.`);
                    }

                    const prevRuns = this.historicBenchmarkData.benchmarks[pb].history[0].runsCount;
                    if(prevRuns !== benchInNew.runsCount) { // TODO change how we get historic runcount
                        throw new Error(`[${pb}] runs count ${prevRuns} doesnt match with the new runs count ${benchInNew.runsCount}, which is not allowed in strict mode.`);
                    }
                });

                const newBenches = measured.results.filter(r => prevBenchmarks.indexOf(r.name) === -1);
                if(newBenches.length !== 0) {
                    throw new Error(`Adding new benches is not allowed in strict mode. New benches: [${newBenches.map(b => b.name)}]`)
                }
            }
        }

        measured.results.forEach(r => {
            
            if(!this.historicBenchmarkData!.benchmarks[r.name]) {
                this.historicBenchmarkData!.benchmarks[r.name] = {
                    name: r.name,
                    history: []
                }
            }

            this.historicBenchmarkData!.benchmarks[r.name].history.push({
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

        if(!this.historicBenchmarkData?.benchmarks[result.name]) {
            // throw new Error(`No benchmark is known named ${name}`);
            return false; // no prev history for this benchmark
        }

        const benchmark = this.historicBenchmarkData.benchmarks[result.name];
        const prev = benchmark.history[benchmark.history.length-1];
        const current = result;

        if(key && key !== "measuredRunsAvgMs" && !(prev.extra as any)?.[key]) {
            // TODO calc extra for new with extraFn from options
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

    // TODO getSpecific run results (by id/date), like in historicRow. will be needed for thresholdcalc too

    getData() { // return json
        // TODO deepCopy
        return this.historicBenchmarkData;
    }

    getDataString() {
        return JSON.stringify(this.getData(), null, 2);
    }

    getThresholds() {
        // return green below alltime avgs min
        // return yellow above alltime avgs max + x perc.
        // return none is 0/1/x preceeding historic
    }
}
// error if same name multiple times in 1 run.

export interface BenchmarkRunHistory { // TODO historyItem
    id?: string; // to identify specific run
    extra?: unknown; // T
    date: Date;

    measuredRunsAvgMs: number;
    totalMs: number;
    runsCount: number;
    measuredRunsMs?: number[];
}

export interface historicBenchmarkData { // TODO maybe run based array would be better, not bench based??
    benchmarks: {
        [key: string]: {
            name: string;
            history: BenchmarkRunHistory[];
        }
    },
    lastBenchmark?: Date;
}

export interface delta {
    measuredRunsAvgMs: {percent: number, ms: number}
    [key: string]: {percent: number, ms: number} // if can find key in extra calc for it. getDeltaForSingle
}

function historicColumn(historic: prettyBenchmarkHistory, options?: {key: string}): ColumnDefinition { // TODO use key
    return {title: "Change", formatter: (result, cd) => {
        const delta = historic.getDeltaForSingle(result);
        if(delta) {
            const perc = (delta.measuredRunsAvgMs.percent * 100).toFixed(0);
            const diff = (Math.abs(delta.measuredRunsAvgMs.ms)).toFixed(2);
            
            if(delta.measuredRunsAvgMs.ms > 0) {
                return `🔺 ${`+${perc}`.padStart(4," ")}% (${diff.padStart(7, " ")}ms)`;
            } else {
                return `🟢  ${perc.padStart(4, " ")}% (${diff.padStart(7, " ")}ms)`;
            }
        }
        return "";
    }};
}

function historicRow(historic: prettyBenchmarkHistory, options?: {key?: string, titleFormatter?: (date: Date, id?: string) => string}): ColumnDefinition[] {
    const benchmarks = historic.getData()?.benchmarks;
    if(benchmarks) {
        const dates: {[key: string]: {benches: {[key: string]: any}, id?: string}} = {};
        Object.keys(benchmarks).forEach(k => {
            const bench = benchmarks[k];

            bench.history.forEach(h => {
                const dateString = JSON.stringify(new Date(h.date));

                if(!dates[dateString]) {
                    dates[dateString] = {benches: {}, id: h.id};
                }

                dates[dateString].benches[bench.name] = {
                    avg: h.measuredRunsAvgMs, // TODO rename avg
                    name: bench.name
                };
            });
            // group them based on date
        });

        const d = (d: Date) => {
            //return `${d.getFullYear()}.${d.getMonth()}.${d.getDate()}<br/>${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
            return d.toISOString().split("T").join('<br/>').replace(/Z/, "");// .slice(0,10)
        };

        const gend: ColumnDefinition[] = Object.keys(dates).sort().map(k => {
            const parsedDate = new Date(JSON.parse(k));
            return {
                title: (options?.titleFormatter ? options.titleFormatter(parsedDate, dates[k].id) : dates[k].id ?? d(parsedDate)),
                formatter: (result: BenchmarkResult) => {
                    if(!dates[k].benches[result.name]) {
                        return '-';
                    }
                    return dates[k].benches[result.name].avg || "-";
                },
                toFixed: 4
            }
        });

        /* gend.push({
            title: 'Current avg (ms)',
            propertyKey: 'measuredRunsAvgMs',
            toFixed: 4
        }); */

        return gend;
    }
    
    return [];
}

function historicProgressExtra(historic: prettyBenchmarkHistory) {
    return (result: BenchmarkResult, options?: prettyBenchmarkProgressOptions) => {
        const delta = historic.getDeltaForSingle(result);
        if(delta) {
            const perc = (delta.measuredRunsAvgMs.percent * 100).toFixed(0);
            const diff = (Math.abs(delta.measuredRunsAvgMs.ms)).toFixed(2);
            
            let deltaString;
            if(delta.measuredRunsAvgMs.ms > 0) {
                deltaString = ` [${colors.red(` ▲ ${`+${perc}`.padStart(4)}% (${diff.padStart(7)}ms)`)}]`;
            } else {
                deltaString = ` [${colors.green(` ▼ ${perc.padStart(4)}% (${diff.padStart(7)}ms)`)}]`;
            }

            if(options?.nocolor) {
                deltaString = stripColor(deltaString);
            }

            return deltaString;
        }
        return "";
    };
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
/*
    bench({
        name: "MZ/X",
        func(b) {
            b.start();
            for (let i = 0; i < 1e5; i++) {
                const NPeP = Math.random() === Math.random();
            }
            b.stop();
        },
        runs: 100
    }); */

    
    let prevString;
    try {
        prevString = JSON.parse(Deno.readTextFileSync('./benchmarks/historic.json'));
    } catch {
        console.warn('⚠ cant read file');
    }

    const historic = new prettyBenchmarkHistory({ saveIndividualRuns: false, minRequiredRuns: 100, onlyHrTime: true, strict: true }, prevString);

    // console.log(JSON.stringify(historic.getData()));

    const inds: BenchIndicator[] = [
        {benches: /historic/, modFn: _ => "👃"}
    ];

    runBenchmarks({silent: true}, prettyBenchmarkProgress({extra: historicProgressExtra(historic), indicators: inds, nocolor: false}))
        // TODO defaultColumns to func, dont get avg, total, just name, maybe runs
        .then(prettyBenchmarkDown(md => {Deno.writeTextFileSync("./benchmarks/hmd.md", md)}, {columns: [{title: 'Name', propertyKey: 'name'}, ...historicRow(historic),{title: 'Average (ms)', propertyKey: 'measuredRunsAvgMs', toFixed: 4}, historicColumn(historic)]})) // historicColumn
        .then((results: BenchmarkRunResult) => {

            historic.addResults(results);

            // console.log(historic.getDeltasFrom(results));

            // Deno.writeTextFileSync("./benchmarks/historic.json", historic.addResults(results).getDataString())
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