export {
  BenchmarkRunResult,
  BenchmarkResult,
  BenchmarkRunProgress,
  ProgressState,
  runBenchmarks,
  bench,
  clearBenchmarks,
} from "https://deno.land/std@0.63.0/testing/bench.ts";

export * as colors from "https://deno.land/std@0.63.0/fmt/colors.ts";

export const test = Deno.test;
