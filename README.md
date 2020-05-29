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

Simply call `prettyBenchmarkResult` with the desired settings.

With `precision` you can define, into how many groups should the results be grouped when displaying a multiple run benchmark result

Use the `silent: true` flag in `runBenchmarks`, if you dont want to see the default output

```ts
// ...add benches...

runBenchmarks()
.then(prettyBenchmarkResult())
.catch((e: any) => {
  console.log(red(e.benchmarkName))
  console.error(red(e.stack));
});
```
or 
```ts
// ...add benches...

runBenchmarks({silent: true})
.then(prettyBenchmarkResult({precision: 5}))
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

