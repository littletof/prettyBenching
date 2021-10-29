// deno-lint-ignore-file

import { snap } from 'https://deno.land/x/snapper@v0.0.5/mod.ts';
import type { SnapParams } from 'https://deno.land/x/snapper@v0.0.5/mod.ts';
import { join } from "https://deno.land/std@0.91.0/path/win32.ts";
import { deltaProgressRowExtra, deltaResultInfoCell, prettyBenchmarkHistory, prettyBenchmarkProgress, prettyBenchmarkProgressOptions, prettyBenchmarkResult, prettyBenchmarkResultOptions } from "../mod.ts";
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

    const postFix = '.png';

    const thresholds = {"multiple-runs": { green: 76, yellow: 82 }};
    const indicators = [{benches: /multiple-runs/, color: colors.magenta,modFn: () => ({indicator: "🚀 ", visibleLength: 2})}];
    const history = new prettyBenchmarkHistory({
        history: [{date: new Date().toISOString(),
            benchmarks: {
                runs100ForIncrementX1e6: {measuredRunsAvgMs: 4.235, totalMs: 4235, runsCount: 1000},
                for100ForIncrementX1e6: {measuredRunsAvgMs: 5.4405, totalMs: 5440.5, runsCount: 1000},
                "multiple-runs": {measuredRunsAvgMs: 133.2134, totalMs: 13321.34, runsCount: 100}
        }}]
    });

    /* Result cards */

    const optionsSet: {name: string, options: prettyBenchmarkResultOptions}[] = [ // TODO remove "snap" postfix
        {name: 'docs/imgs/prettyBenchingResult_example_threshold', options: {thresholds}},
        {name: 'docs/imgs/prettyBenchingResult_example_indicator', options: {indicators}},
        {name: 'docs/imgs/prettyBenchingResult_example_indicators', options: {thresholds, indicators}},
        {name: 'docs/imgs/prettyBenchingResult_example_full_extra', options: {thresholds, indicators: [{benches: /multiple-runs/, color: colors.blue,modFn: () => colors.bgYellow(colors.bold(colors.black("%")))}], parts: {extraMetrics: true,threshold: true,graph: true,graphBars: 10 }}},
        {name: 'docs/imgs/prettyBenchingResult_example_extrametrics_line', options: {thresholds, parts: {extraMetrics: true}}},
        {name: 'docs/imgs/prettyBenchingResult_example_threshold_line', options: {thresholds, parts: {threshold: true, graph: true}}},
        {name: 'docs/imgs/prettyBenchingHistory_result_card_delta', options: {infoCell: deltaResultInfoCell(history)}},
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
    snaps.push({content: result.replace(/\n$/, ''), imageSavePath: "docs/imgs/prettyBenchingResult_example", viewport: {width: 780}});

    /* Progress */

    const progressCases = [
        {name: 'docs/imgs/prettyBenchingProgress_example_running', state: buildProgressState([
            fakeStart(10,0),
            fakeBenched('runs100ForIncrementX1e6', 100, 44.2054, 0.4421),
            fakeBenched('for100ForIncrementX1e6', 100, 45.1917, 0.4519),
            fakeProgress('for100ForIncrementx1e8', 100, 54)
        ]), options: {}},
        {name: 'docs/imgs/prettyBenchingProgress_example_finished', state: buildProgressState([
            fakeStart(8,0),
            fakeBenched('runs100ForIncrementX1e6', 100, 44.2054, 0.4421),
            fakeBenched('for100ForIncrementX1e6', 100, 45.1917, 0.4519),
            fakeBenched('for100ForIncrementx1e8', 100, 3758.5008, 37.5850),

            fakeBenched('forIncrementX1e9', 1, 722.7738, 722.7738),
            fakeBenched('forIncrementX1e9x2', 1, 12620.5453, 12620.5453),
            fakeBenched('single', 1, 0.0183, 0.0183),
            fakeBenched('multiple', 2, 0.0513, 0.0256),
            fakeBenched('custom', 100, 18.9176, 0.0189),
            fakeFinished()
        ]), options: {}},
        {name: 'docs/imgs/prettyBenchingProgress_example_indicators', state: buildProgressState([
            fakeBenched('runs100ForIncrementX1e6', 100, 44.2054, 0.4421),
            fakeBenched('for100ForIncrementX1e6', 100, 45.1917, 0.4519),

            fakeBenched('forIncrementX1e9', 1, 722.7738, 722.7738),
            fakeBenched('single', 1, 0.0183, 0.0183),
            fakeBenched('multiple', 2, 0.0513, 0.0256),
            fakeBenched('custom', 100, 18.9176, 0.0189),
        ]), options: {
            indicators: [
                { benches: /100/, modFn: () => colors.bgRed('#') },
                { benches: /for/, modFn: () => colors.red('#') },
                { benches: /multiple/, modFn: colors.cyan},
                { benches: /custom/, modFn: () => colors.bgYellow(colors.black("%")) }
            ]
        } as prettyBenchmarkProgressOptions},
        {name: 'docs/imgs/prettyBenchingProgress_example_threshold', state: buildProgressState([
            fakeStart(5,3),
            fakeBenched('runs100ForIncrementX1e6', 100, 68, 0.68),
            fakeBenched('for100ForIncrementX1e6', 100, 108, 1.08),
            fakeBenched('for100ForIncrementx1e8', 100, 9056, 90.56),
            fakeBenched('forIncrementX1e9', 1, 848, 848),
            fakeBenched('forIncrementX1e9x2', 1, 14904,14904),
            fakeFinished()
        ]), options: {
            thresholds: {
                "for100ForIncrementX1e6": {green: 0.85, yellow: 1},
                "for100ForIncrementX1e8": {green: 84, yellow: 93},
                "forIncrementX1e9": {green: 900, yellow: 800},
                "forIncrementX1e9x2": {green: 15000, yellow: 18000},
            }
        } as prettyBenchmarkProgressOptions},
        {name: 'docs/imgs/prettyBenchingHistory_progress_delta', state: buildProgressState([            
            fakeBenched('runs100ForIncrementX1e6', 1000, 2831.9055, 2.8319),
            fakeBenched('for100ForIncrementX1e6', 1000, 5687.3089, 5.6873),
            fakeBenched('for100ForIncrementx1e8', 1000, 2754.4350, 2.7544),
        ]), options: {
            rowExtras: deltaProgressRowExtra(history)
        } as prettyBenchmarkProgressOptions, viewport: {width: 1200}}
    ];

    snaps.push(...progressCases.map(c => {
        let result = "";
        const progressFnc = prettyBenchmarkProgress({outputFn: (res) => result += (res.indexOf('Benchmarking finished') !== -1 ? '\n\n':'') + res, ...c.options});

        const states = buildProgressState(c.state);
        states.forEach(state => progressFnc(state));

        result = result.replace(/^\x1B\[1A\r/, '').replace(/^\n/, '').replace(/\n$/, ''); //replace first up1Cl causing empty line

        return {content: result, imageSavePath: c.name,viewport:{width: 1000, ...c.viewport}} as SnapParams;
    }) as any)


    await snap(snaps.map(s => ({...s, imageSavePath: s.imageSavePath + postFix})), {verbose: true, viewport: {deviceScaleFactor: 1}});
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
