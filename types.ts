/* ------------------- Common types ------------------- */

export interface BenchIndicator {
    benches: RegExp; 
    modFn?: (str: string) => string;
    color?: (str: string) => string;
}

export interface Threshold {
    green: number;
    yellow: number;
}

export interface Thresholds {
    [key: string]: Threshold;
}