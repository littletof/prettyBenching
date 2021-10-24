import { snap } from 'https://deno.land/x/snapper@v0.0.4/mod.ts';
import type { SnapParams } from 'https://deno.land/x/snapper@v0.0.4/mod.ts';
import { join } from "https://deno.land/std@0.91.0/path/win32.ts";
import { prettyBenchmarkResult, prettyBenchmarkResultOptions } from "../mod.ts";
import { colors } from "../deps.ts";

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

    const progressData: any[] = readJsonSync(join(pathBase, "benchmark_progress_inputs.json")) as any;
    const resultData = readJsonSync(join(pathBase, "benchmark_result_input.json"));


    const thresholds = {"multiple-runs": { green: 76, yellow: 82 }};
    const indicators = [{benches: /multiple-runs/, color: colors.magenta,modFn: () => ({indicator: "🚀 ", visibleLength: 2})}];

    const optionsSet: {name: string, options: prettyBenchmarkResultOptions}[] = [ // TODO remove "snap" postfix
        {name: 'docs/imgs/prettyBenchingResult_example_threshold_snap.png', options: {thresholds}},
        {name: 'docs/imgs/prettyBenchingResult_example_indicator_snap.png', options: {indicators}},
        {name: 'docs/imgs/prettyBenchingResult_example_indicators_snap.png', options: {thresholds, indicators}},
        {name: 'docs/imgs/prettyBenchingResult_example_full_extra_snap.png', options: {thresholds, indicators: [{benches: /multiple-runs/, color: colors.blue,modFn: () => colors.bgYellow(colors.bold(colors.black("%")))}], parts: {extraMetrics: true,threshold: true,graph: true,graphBars: 10 }}},
        {name: 'docs/imgs/prettyBenchingResult_example_extrametrics_line_snap.png', options: {thresholds, parts: {extraMetrics: true}}},
        {name: 'docs/imgs/prettyBenchingResult_example_threshold_line_snap.png', options: {thresholds, parts: {threshold: true, graph: true}}},
    ];

    const mr = {filtered: 0, results: [resultData.results[2]]};
    const snaps: SnapParams[] = [];
    snaps.push(...optionsSet.map(op => {
        let result = "";
        prettyBenchmarkResult({outputFn: (res) => result += res, ...op.options})(mr);

        return {content: result, imageSavePath: op.name} as any
    }));

    let result = "";
    prettyBenchmarkResult({outputFn: (res) => result += res})(resultData);
    snaps.push({content: result, imageSavePath: "docs/imgs/prettyBenchingResult_example_snap.png", viewport: {deviceScaleFactor: 1, width: 875, height: 575}});

    await snap(snaps, {verbose: true});
}

function readJsonSync(path: string) {
    return JSON.parse(Deno.readTextFileSync(path));
}

if(import.meta.main) {
    generateDocsImages();
}
