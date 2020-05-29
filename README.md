# prettyBenching

A simple Deno library, that gives you pretty benchmarking progress and results

**⚠ The lib is in a very early stage and needs not yet published features of Deno ⚠**

## Getting started
Add the following to your `deps.ts`
```ts 
export {
  prettyBenchmarkResult,
  prettyBenchmartProgress
} from 'https://raw.githubusercontent.com/littletof/prettyBenching/master/mod.ts';
```

or just simply
```ts
import { prettyBenchmarkResult, prettyBenchmartProgress } from 'https://raw.githubusercontent.com/littletof/prettyBenching/master/mod.ts';
```

##

# prettyBenchmarkResults

Prints the Deno `runBenchmarks()` methods result in a nicely readable format.

### Usage

Use the `silent: true` flag, if you dont want to see the default output

```ts
// ...add benches...

runBenchmarks({silent: true})
.then(prettyBenchmarkResult)
.catch((e: any) => {
  console.log(red(e.benchmarkName))
  console.error(red(e.stack));
});
```

The output would look something like this:
![example](https://raw.githubusercontent.com/littletof/prettyBenching/master/docs/imgs/prettyBenchingResult_example.png?token=AHUHUPXFBMXDGIBPEPRCMBS63JMA2)


# prettyBenchmarkProgress

Prints the Deno `runBenchmarks()` methods `progressCb` callback values in a nicely readable format.

### Usage
```ts

```

The output would look something like this:

