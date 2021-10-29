import { snap } from 'https://deno.land/x/snapper@v0.0.5/mod.ts';
import type { SnapParams } from 'https://deno.land/x/snapper@v0.0.5/mod.ts';
import { join } from "https://deno.land/std@0.91.0/path/win32.ts";
import { prettyBenchmarkProgress, prettyBenchmarkResult, prettyBenchmarkResultOptions } from "../mod.ts";
import { BenchmarkRunProgress, colors, ProgressState } from "../deps.ts";

async function generateDocsImages() {
    const pathBase = join(".", "docs", "showcase");

    await Deno.permissions.request({name: 'hrtime'});
    const readResult = await Deno.permissions.request({name: 'read', path: pathBase});
    if(readResult.state !== 'granted') {
        console.error('Can\'t run without input data for the benchmark. Exiting...');
        Deno.exit(1);
    }
    const writeResult = await Deno.permissions.request({name: 'write', path: pathBase});
    if(writeResult.state !== 'granted') {
        console.error('Can\'t save result without write permission. Exiting...');
        Deno.exit(1);
    }

    const resultData = readJsonSync(join(pathBase, "benchmark_result_input.json"));


    const thresholds = {"multiple-runs": { green: 76, yellow: 82 }};
    const indicators = [{benches: /multiple-runs/, color: colors.magenta,modFn: () => ({indicator: "🚀 ", visibleLength: 2})}];

    const optionsSet: {name: string, options: prettyBenchmarkResultOptions}[] = [ // TODO remove "snap" postfix
        // {name: 'docs/imgs/prettyBenchingResult_example_threshold_snap.png', options: {thresholds}},
        // {name: 'docs/imgs/prettyBenchingResult_example_indicator_snap.png', options: {indicators}},
        // {name: 'docs/imgs/prettyBenchingResult_example_indicators_snap.png', options: {thresholds, indicators}},
        // {name: 'docs/imgs/prettyBenchingResult_example_full_extra_snap.png', options: {thresholds, indicators: [{benches: /multiple-runs/, color: colors.blue,modFn: () => colors.bgYellow(colors.bold(colors.black("%")))}], parts: {extraMetrics: true,threshold: true,graph: true,graphBars: 10 }}},
        // {name: 'docs/imgs/prettyBenchingResult_example_extrametrics_line_snap.png', options: {thresholds, parts: {extraMetrics: true}}},
        // {name: 'docs/imgs/prettyBenchingResult_example_threshold_line_snap.png', options: {thresholds, parts: {threshold: true, graph: true}}},
    ];

    const mr = {filtered: 0, results: [resultData.results[2]]};
    const snaps: SnapParams[] = [];
    snaps.push(...optionsSet.map(op => {
        let result = "";
        prettyBenchmarkResult({outputFn: (res) => result += res, ...op.options})(mr);
        result = result.replace(/\n$/, '');
        return {content: result, imageSavePath: op.name,viewport:{width: 780}} as SnapParams
    }));

    let result = "";
    prettyBenchmarkResult({outputFn: (res) => result += res})(resultData);
    // snaps.push({content: result, imageSavePath: "docs/imgs/prettyBenchingResult_example_snap.png", viewport: {deviceScaleFactor: 1, width: 875, height: 595}});


    /** Progress */

    const progressCases = [
        {name: 'docs/imgs/prettyBenchingProgress_example_running_snap.png', state: buildProgressState([
            fakeStart(10,0),
            fakeBenched('runs100ForIncrementX1e6', 100, 44.2054, 0.4421),
            fakeBenched('for100ForIncrementX1e6', 100, 45.1917, 0.4519),
            fakeProgress('for100ForIncrementx1e8', 100, 54)
        ]), options: {}},
        {name: 'docs/imgs/prettyBenchingProgress_example_finished_snap.png', state: buildProgressState([
            fakeStart(8,0),
            fakeBenched('runs100ForIncrementX1e6', 100, 44.2054, 0.4421),
            fakeBenched('for100ForIncrementX1e6', 100, 45.1917, 0.4519),
            fakeBenched('for100ForIncrementx1e8', 100, 3758.5008, 37.5850),

            fakeBenched('forIncrementX1e9', 1, 722.7738, 722.7738),
            fakeBenched('forIncrementX1e9x2', 1, 12620.5453, 12620.5453),
            fakeBenched('single', 1, 0.0183, 0.0183),
            fakeBenched('multiple', 2, 0.0513, 0.0256),
            fakeBenched('multiple', 100, 18.9176, 0.0189),
            fakeFinished()
        ]), options: {}},
    ];

    snaps.push(...progressCases.map(c => {
        let result = "";
        const progressFnc = prettyBenchmarkProgress({outputFn: (res) => result += (res.indexOf('Benchmarking finished') !== -1 ? '\n\n':'') + res, ...c.options});

        const states = buildProgressState(c.state);
        states.forEach(state => progressFnc(state));

        return {content: result, imageSavePath: c.name,viewport:{width: 1000}} as SnapParams;
    }) as any)


    await snap(snaps, {verbose: true});
}

function readJsonSync(path: string) {
    return JSON.parse(Deno.readTextFileSync(path));
}

function buildProgressState(fakeStates: any[]): BenchmarkRunProgress[] {
    return fakeStates.reduce((pv: any[], cv: any[]) => {return pv.concat(cv);}, []);
}

function fakeStart (queued: number, filtered: number) {
    return [{
        queued: new Array(queued),
        results: [],
        filtered: filtered,
        state: ProgressState.BenchmarkingStart
    }];
}

function fakeFinished () {
    return [{
        queued: [],
        results: [],
        filtered: 0,
        state: ProgressState.BenchmarkingEnd
    }];
}

function fakeBenched(name: string, runsCount: number, totalMs: number, avg: number) {
    return [
        // ...fakeProgress(name, runsCount, 0),
        {queued: [],results: [{name, totalMs, runsCount, measuredRunsAvgMs: avg, measuredRunsMs:[]}],filtered: 0,state: ProgressState.BenchResult}
    ]
};
function fakeProgress(name: string, runsCount: number, progress: number){ 
    return [
        // {state: ProgressState.BenchStart,filtered: 0,queued: [],results: [],running: {name,runsCount,measuredRunsMs: []}},
        {queued: [],results: [],filtered: 0,running: {name,runsCount,measuredRunsMs: new Array(progress)},state: ProgressState.BenchPartialResult}
    ]
};

if(import.meta.main) {
    generateDocsImages();
}
