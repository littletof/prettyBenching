import { Colorer } from "./colorer.ts";
import {
  getResultCard,
  prettyBenchmarkCardResultOptions,
} from "./benchmark_result_card.ts";
import type { BenchmarkRunResult } from "./deps.ts";

interface CommonOptions {
  /** Overrides the default output function, which is `console.log`. */
  outputFn?: (log: string) => unknown;
}

/** Defines how the resulting output should look like. */
export type prettyBenchmarkResultOptions =
  & CommonOptions
  & (prettyBenchmarkCardResultOptions);

const c: Colorer = new Colorer();

/** Returns a function that expects a `BenchmarkRunResult`, which than prints 
 * the results in a nicely formatted way, based on the provided `options`.
 * 
 * Typical basic usage:
 * 
 * ```ts
 * // add benches, then
 * runBenchmarks().then(prettyBenchmarkResult());
 * ```
 * .
 */
export function prettyBenchmarkResult(
  /** Defines how the output should look like */
  options?: prettyBenchmarkResultOptions,
) {
  return (result: BenchmarkRunResult) =>
    _prettyBenchmarkResultCb(
      result,
      options,
    );
}

function _prettyBenchmarkResultCb(
  results: BenchmarkRunResult,
  options?: prettyBenchmarkResultOptions,
) {
  if (options?.nocolor) {
    c.setColorEnabled(false);
  }

  const output = results.results.map((r) => {
    // TODO switch on options.type
    return getResultCard(r, c, options);
  }).join("\n");

  typeof options?.outputFn == "function"
    ? options.outputFn(output)
    : console.log(output);

  if (options?.nocolor) {
    c.setColorEnabled(true);
  }

  return results;
}
