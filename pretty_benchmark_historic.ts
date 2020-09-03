import { runBenchmarks, BenchmarkResult, BenchmarkRunResult } from "https://deno.land/std@0.67.0/testing/bench.ts";
import { prettyBenchmarkProgress } from "./pretty_benchmark_progress.ts";
import { prettyBenchmarkResult } from "./pretty_benchmark_result.ts";
import { prettyBenchmarkDown } from "./pretty_benchmark_down.ts";

export interface prettyBenchmarkHistoricOptions {
    strict: boolean,
    onlyHrTime: boolean,
    extra: (result: BenchmarkResult) => unknown // T here precalc and save extra metrics
    saveIndividualRuns: boolean;
    // save precalced -> inside extra
}

export class prettyBenchmarkHistoric { // only work with JSON no file handling
    constructor(/* options, prev: JSON*/) {}

    private init() {}
    private load() {} // contruct dates

    addResults(){}

    getDeltaFrom(results: BenchmarkRunResult){}

    getDeltaForSingle(results: BenchmarkRunResult, key: string) {
        // error if key not in results
        // error / nodelta if key is not in historic
    }

    getData() { // return json

    }

}
// error if same name multiple times in 1 run.

export interface historicData {
    benchmarks: {
        [key: string]: {
            name: string;
            id: string;
            extra: unknown; // T
            date: Date;

            runs: [];
            avg: number;
            total: number;
        }
    },
    lastBenchmark: Date;
}

function historicColumn(historic: prettyBenchmarkHistoric, options?: {key: string}): any {

}

function example() {

    const historic = new prettyBenchmarkHistoric();

    runBenchmarks({silent: true}, prettyBenchmarkProgress()) // into "extra"
    .then(prettyBenchmarkResult()) // to determine
    .then(prettyBenchmarkDown(console.log, {columns: [...historicColumn(historic)]})) // historicColumn
    .then((results: BenchmarkRunResult) => {
        Deno.writeTextFileSync("./benchmarks/historic.json", JSON.stringify(historic.getData()))
    })
}