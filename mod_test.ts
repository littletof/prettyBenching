import { test, assert, assertEquals } from "./test_deps.ts";
import * as mod from "./mod.ts";

test({
  name: "public API assertions",
  fn() {
    assert(mod != null);
    assertEquals(typeof mod.prettyBenchmarkResult, "function");
    assertEquals(typeof mod.prettyBenchmarkProgress, "function");
    assertEquals(typeof mod.prettyBenchmarkDown, "function");
    assertEquals(Object.keys(mod).length, 3);
  },
});
