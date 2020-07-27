import { BenchmarkRunResult, BenchmarkResult } from "./deps.ts";

// TODO add columns: {head: string, propertyKey: string}
// if undefined put - on place
// foreign keys are allowed, but values for them have to be put manually on the results

// TODO Add the indicators somehow

// TODO historic: better or worse by x percent to last value

// TODO example github action on commits/PRs it comments on the pr if it got better or worse

// TODO support automatic output to file instead of cb function

export interface prettyBenchmarkDownOptions {
    title?: string;
    description?: string;
    footer?: string;
    groups?: {include: RegExp, name: string, description?: string}[];
    columns?: ColumnDefinition[];
    output?: (out: string) => void;
}

interface ColumnDefinition {
    title: string;
    propertyKey?: string;
    align?: 'left'|'center'|'right';
    toFixed?: number;
    formatter?: (result: BenchmarkResult, columnDef: ColumnDefinition) => string;
}

export function prettyBenchmarkDown(options?: prettyBenchmarkDownOptions) {
    return (result: BenchmarkRunResult) => _prettyBenchmarkDown(result, options);
}

export function _prettyBenchmarkDown(result: BenchmarkRunResult, options?: prettyBenchmarkDownOptions) {
    let markdown = "";

    if(options?.title) {
        markdown+= `# ${options.title}\n\n`;
    }

    if(options?.description) {
        markdown+= `${options.description}\n\n`;
    }

    if(options?.groups && options.groups.length > 0) {

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

            markdown+= headerRow(options);
            group.items.forEach((r: BenchmarkResult) => {
                markdown+=tableRow(r, options);
            });

            markdown+='\n\n';
        });

    } else {
        markdown+= headerRow(options);
        result.results.forEach(r => {
            markdown+=tableRow(r, options);
        });
        markdown+='\n\n';
    }

    if(options?.footer) {
        markdown+= `\n---\n${options.footer}\n`;
    }

    if(options?.output) {
        options.output(markdown);
    } else {
        console.log(markdown);
    }

    return result;
}

const defaultColumns: ColumnDefinition[] = [
    {title: 'Runs', propertyKey: 'runsCount', align: 'right'},
    {title: 'Total (ms)', propertyKey: 'totalMs', align: 'right', toFixed: 3},
    {title: 'Average (ms)', propertyKey: 'measuredRunsAvgMs', align: 'right', toFixed: 3},
];

function headerRow(options?: prettyBenchmarkDownOptions) {
    let titles = '|Name|';
    let alignments = '|---|';

    const columns: ColumnDefinition[] = options?.columns ? options.columns : defaultColumns;

    // TODO if historic/treshold columns.push

    columns.forEach(c => {
        titles+=`${c.title}|`;
        alignments+=`${alignment(c.align)}|`;
    });

    return `${titles}\n${alignments}\n`;
}

function tableRow(result: BenchmarkResult, options?: prettyBenchmarkDownOptions) {
    let values = `|${result.name}|`;
    
    const columns: ColumnDefinition[] = options?.columns ? options.columns : defaultColumns;

    // TODO if historic/treshold columns.push

    columns.forEach(c => {

        let value = null;
        if(typeof c.formatter === 'function') {
            value = `${c.formatter(result, c)}`;
        } else {
            value = (result as any)[c.propertyKey!] || '-';
        }

        if(!isNaN(value) && !isNaN(c.toFixed!)) {
            value = value.toFixed(c.toFixed);
        }

        values+=`${value}|`;
    });

    return `${values}\n`;
}

function alignment(mode?: 'left'|'center'|'right') {
    if(mode === 'right') {
        return '--:';
    }
    if(!mode || mode === 'center') {
        return ':-:';
    }
    if(mode === 'left') {
        return ':--';
    }
}