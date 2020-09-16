import { assert, assertEquals } from "./test_deps.ts";
import * as mod from "../mod.ts";

Deno.test({
  name: "public API assertions",
  fn() {
    assert(mod != null);
    assertEquals(typeof mod.prettyBenchmarkResult, "function");
    assertEquals(typeof mod.prettyBenchmarkProgress, "function");

    assertEquals(typeof mod.prettyBenchmarkDown, "function");
    assertEquals(typeof mod.indicatorColumn, "function");
    assertEquals(typeof mod.thresholdsColumn, "function");
    assertEquals(typeof mod.thresholdResultColumn, "function");
    assertEquals(typeof mod.extraMetricsColumns, "function");
    assertEquals(typeof mod.defaultColumns, "function");

    assertEquals(typeof mod.calculateExtraMetrics, "function");
    assertEquals(typeof mod.calculateStdDeviation, "function");
    assertEquals(typeof mod.calculateThresholds, "function");

    assertEquals(typeof mod.prettyBenchmarkHistory, "function");
    assertEquals(typeof mod.deltaResultInfoCell, "function");
    assertEquals(typeof mod.deltaProgressRowExtra, "function");
    assertEquals(typeof mod.deltaColumn, "function");
    assertEquals(typeof mod.historyColumns, "function");

    assertEquals(Object.keys(mod).length, 16);
  },
});
