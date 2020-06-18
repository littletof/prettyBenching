import { BenchmarkRunResult } from "./deps.ts";
import { Colorer } from "./colorer.ts";
import {
  getResultCard,
  prettyBenchmarkCardResultOptions,
} from "./benchmark_result_card.ts";

// deno-lint-ignore no-explicit-any
type outputFn = (log: string) => any;

interface CommonOptions {
  outputFn?: outputFn;
}

export type prettyBenchmarkResultOptions = CommonOptions &
  prettyBenchmarkCardResultOptions;

const c: Colorer = new Colorer();

export function prettyBenchmarkResult(
  options: prettyBenchmarkResultOptions = {}
) {
  return (result: BenchmarkRunResult) =>
    _prettyBenchmarkResultCb(result, options);
}

function _prettyBenchmarkResultCb(
  results: BenchmarkRunResult,
  options: prettyBenchmarkResultOptions
) {
  if (options.nocolor) c.setColorEnabled(false);

  const output = results.results
    .map((r) => {
      // TODO switch on options.type
      return getResultCard(r, c, options);
    })
    .join("\n");

  typeof options.outputFn == "function"
    ? options.outputFn(output)
    : console.log(output);

  if (options.nocolor) c.setColorEnabled(true);

  return results;
}
