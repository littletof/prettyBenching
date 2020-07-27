import { BenchmarkRunResult, BenchmarkResult } from "./deps.ts";

export function prettyBenchmarkDown(options: {title?: string, description?: string, footer?: string, groups?: {include: RegExp, name: string, description?: string}[], output: (out: string) => void}) {
    return (result: BenchmarkRunResult) => _prettyBenchmarkDown(result, options);
}

export function _prettyBenchmarkDown(result: BenchmarkRunResult, options: {title?: string, description?: string, footer?: string, groups?: {include: RegExp, name: string, description?: string}[], output: (out: string) => void}) {
    let markdown = "";

    if(options.title) {
        markdown+= `# ${options.title}\n\n`;
    }

    if(options.description) {
        markdown+= `${options.description}\n\n`;
    }

    if(options.groups && options.groups.length > 0) {

        let groupped: any = {'unmatched': {name: 'unmatched', items: []}};

        result.results.forEach(r =>{
            let matched = false;
            options.groups?.forEach(g => {
                if(r.name.match(g.include)) {
                    if(!groupped[g.name]) {
                        groupped[g.name] = {...g, items: []};
                    }

                    groupped[g.name].items.push(r);

                    matched = true;
                }
            });

            if(!matched) {
                if(!groupped['unmatched'].items.some((i: BenchmarkResult) => i.name === r.name && i.totalMs === r.totalMs)){
                    groupped['unmatched'].items.push(r);
                }
            }
        });

        Object.keys(groupped).forEach(k => {
            const group = groupped[k];

            if(k != 'unmatched') {
                markdown+= `## ${group.name}\n\n`;

                if(group.description) {
                    markdown+=`${group.description}\n`;
                }
            }

            markdown+= headerRow();
            group.items.forEach((r: BenchmarkResult) => {
                markdown+=tableRow(r);
            });

            markdown+='\n\n';
        });

    } else {
        markdown+= headerRow();
        result.results.forEach(r => {
            markdown+=tableRow(r);
        });
        markdown+='\n\n';
    }

    if(options.footer) {
        markdown+= `\n---\n${options.footer}\n`;
    }

    options.output(markdown);
    return markdown;
}

function headerRow() {
    return `|Name|Runs|Total (ms)|Average (ms)|\n|---|--:|--:|--:|\n`;
}

function tableRow(result: BenchmarkResult) {
    return `|${result.name}|${result.runsCount}|${result.totalMs.toFixed(3)}|${result.measuredRunsAvgMs.toFixed(3)}|\n`
}