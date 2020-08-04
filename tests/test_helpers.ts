import { assertThrows } from "./test_deps.ts";

export interface TestCase<T = unknown, K = unknown> {
  input: T;
  result?: K;
  // deno-lint-ignore-next-line no-explicit-any
  exception?: { error?: any; msg?: any };
  desc?: string;
}

export function testEach<T, K>(
  name: string,
  input: TestCase<T, K>[],
  fn: (testCase: TestCase<T, K>) => void,
  os?: "only" | "skip",
) {
  input.forEach((input, i) => {
    Deno.test({
      name: `${name} [${i}]`,
      fn() {
        if (input.exception) {
          assertThrows(
            () => fn(input),
            input.exception?.error,
            input.exception?.msg,
          );
        } else {
          fn(input);
        }
      },
      only: os === "only",
      ignore: os === "skip",
    });
  });
}
