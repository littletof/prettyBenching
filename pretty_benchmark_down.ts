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
    afterTables?: string;
    groups?: GroupDefinition[];
    columns?: ColumnDefinition[];
    output?: (out: string) => void;
}


// TODO move interfaces into a common file
interface ColumnDefinition {
    title: string;
    propertyKey?: string;
    align?: 'left'|'center'|'right';
    toFixed?: number;
    formatter?: (result: BenchmarkResult, columnDef: ColumnDefinition) => string;
}

interface GroupDefinition {
    include: RegExp;
    name: string;
    columns?: ColumnDefinition[];
    description?: string;
    afterTable?: string;
}

interface BenchIndicator {
    benches: RegExp; 
    modFn?: (str: string) => string;
}

interface Thresholds {
    [key: string]: { green: number; yellow: number } 
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
        markdown+= `${options.description}\n`;
    }

    if(options?.groups && options.groups.length > 0) {

        let grouppedResults: { [key: string]: GroupDefinition & { items: BenchmarkResult[] }}  = {};
        const unmatched: GroupDefinition & { items: BenchmarkResult[] } = {name: 'Ungrouped benches', items: []} as any;            

        result.results.forEach(r =>{
            let matched = false;
            options.groups?.forEach(g => {
                if(r.name.match(g.include)) {
                    if(!grouppedResults[g.name]) {
                        grouppedResults[g.name] = {...g, items: []};
                    }

                    grouppedResults[g.name].items.push(r);

                    matched = true;
                }
            });

            if(!matched) {
                if(!unmatched.items.some((i: BenchmarkResult) => i.name === r.name && i.totalMs === r.totalMs)){
                    unmatched.items.push(r);
                }
            }
        });

        grouppedResults['unmatched'] = unmatched;

        Object.keys(grouppedResults).forEach(k => {
            const resultGroup = grouppedResults[k];

            markdown+= `## ${resultGroup.name}\n\n`;

            if(resultGroup.description) {
                markdown+=`${resultGroup.description}\n`;
            }

            markdown+= headerRow(options, resultGroup);
            resultGroup.items.forEach((r: BenchmarkResult) => {
                markdown+=tableRow(r, options, resultGroup);
            });

            markdown+='\n';

            if(resultGroup.afterTable) {
                markdown+=`${resultGroup.afterTable}\n`;
            }
        });

    } else {
        markdown+= headerRow(options);
        result.results.forEach(r => {
            markdown+=tableRow(r, options);
        });
        markdown+='\n';
    }

    if(options?.afterTables) {
        markdown+= `${options.afterTables}\n`;
    }

    if(options?.output) {
        options.output(markdown);
    } else {
        console.log(markdown);
    }

    return result;
}

export const defaultColumns: ColumnDefinition[] = [
    {title: 'Name', propertyKey: 'name', align: 'left'},
    {title: 'Runs', propertyKey: 'runsCount', align: 'right'},
    {title: 'Total (ms)', propertyKey: 'totalMs', align: 'right', toFixed: 3},
    {title: 'Average (ms)', propertyKey: 'measuredRunsAvgMs', align: 'right', toFixed: 3},
];
export function indicatorColumn(indicators: BenchIndicator[]): ColumnDefinition {
    return {title: '', formatter: (result: BenchmarkResult, cd: ColumnDefinition) => {
        const indicator = indicators.find(({ benches }) => benches.test(result.name));
        return (!!indicator && typeof indicator.modFn == "function")
            ? indicator.modFn('#') // TODO use const-s ts for # everywhere
            : " ";
    }};
}

export function thresholdResultColumn(thresholds: Thresholds) {
    return {title: '', formatter: (result: BenchmarkResult, cd: ColumnDefinition) => {
        const inRange = getInThresholdRange(result, thresholds);
        
        return ["-", "✅", "🔶", "🔴"][inRange || 0];
    }};
}

export function thresholdsColumn(thresholds: Thresholds, showResult?: boolean) {
    return {title: 'Thresholds', align: 'right', formatter: (result: BenchmarkResult, cd: ColumnDefinition) => {
        let value = "<small>";
        const inRange = getInThresholdRange(result, thresholds);
        const th = thresholds && thresholds[result.name];

        if(!th) {
            return "-";
        }

        value+= `<= ${th.green} ✅` + (showResult ? (inRange === 1 ? '◀' : ' ◽') : '') + '<br>';
        value+= `<= ${th.yellow} 🔶` + (showResult ? (inRange === 2 ? '◀' : ' ◽') : '') + '<br>';
        value+= ` > ${th.yellow} 🔴` + (showResult ? (inRange === 3 ? '◀' : ' ◽') : '');

        value += '</small>';

        return value;
    }};
}

/* TODO
export function historyColumn(){

}*/

// TODO util
function getInThresholdRange(result: BenchmarkResult, thresholds: Thresholds) {
    const th = thresholds && thresholds[result.name];
    const time = result.measuredRunsAvgMs;
    if (!!th) {
        if (time <= th.green) return 1;
        if (time <= th.yellow) return 2;
        if (th.yellow < time) return 3;
    }
    return null;
}

function headerRow(options?: prettyBenchmarkDownOptions, group?: GroupDefinition) {
    let titles = '|';
    let alignments = '|';

    const columns: ColumnDefinition[] = group?.columns || options?.columns || defaultColumns;

    // TODO if historic/treshold columns.push

    columns.forEach(c => {
        titles+=`${c.title}|`;
        alignments+=`${alignment(c.align)}|`;
    });

    return `${titles}\n${alignments}\n`;
}

function tableRow(result: BenchmarkResult, options?: prettyBenchmarkDownOptions, group?: GroupDefinition) {
    let values = `|`;
    
    const columns: ColumnDefinition[] = group?.columns || options?.columns || defaultColumns;

    // TODO if historic/treshold columns.push

    columns.forEach(c => {

        let value = null;
        if(typeof c.formatter === 'function') {
            value = `${c.formatter(result, c)}`;
        } else {
            if(!c.propertyKey) {
                value = '*'; // this means no formatter function and no propertyKey was defined.
            } else {
                value = (result as any)[c.propertyKey] || '-';
            }
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