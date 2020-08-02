# An example benchMarkdown

This markdown was generated with the use of `prettyBenchmarkDown`.

Check out how to generate a file like this: [pr_benchmarks.ts](https://github.com/littletof/prettyBenching/blob/docs/prettyBenchmarkDown/pr_benchmarks.ts)

If you use a function for the `description` or `afterTables`, you can process the results here as well:

 > In this benchmark 7 benches were run, 1 filtered.

## Default columns and dynamic text

This is a group's `description`.
Here you can see what the default columns are, and how you can use a `function` as `description` or `afterTable` inside a group

|Name|Runs|Total (ms)|Average (ms)|
|:--|--:|--:|--:|
|Sorting arrays|4000|1801.169|0.450|
|Rotating arrays|1000|2021.054|2.021|

This is a group's `afterTable`.
Here you can access eg. the group name: `Default columns and dynamic text`, benchmarks in this group: `2` of them here, or the whole `BenchmarkRunResult`: `7` benchmarks total

## Custom columns

|Name|Runs|Total (ms)|CustomTotal|Formatter|Undefined|Bad Config|
|:--|--:|--:|:--|:-:|:-:|:-:|
|Sorting arrays|4000|1801.169|1801.16940|syarra gnitroS:rettamroF <-|-|*|
|Rotating arrays|1000|2021.054|2021.05430|syarra gnitatoR:rettamroF <-|-|*|

If you see `-`, that means the value there was `undefined`, if you see `*` it means that column is badly configured, no `formatter` or `propertyKey` was defined.

## Predefiend columns

Here you can see, what the predefined columns are.

You can add the `indicators` and `thresholds` that you use in `prettyBenchmarkProgress` and `prettyBenchmarkResults`.

You can see, how you can rename columns like with `Thresholds+`
||Name|Runs|Total (ms)|Average (ms)|Thresholds|Thresholds+||
|:-:|:--|--:|--:|--:|--:|--:|:-:|
| |Rotating other things|1000|2143.992|2.144|-|-|-|
|🎹|Rotating arrays|1000|2021.054|2.021|<small><= 3.5 ✅<br><= 4.4 🔶<br> > 4.4 🔴</small>|<small><= 3.5 ✅ 🠴<br><= 4.4 🔶 <br> > 4.4 🔴 </small>|✅|
|%|Proving NP==P|1|4384.908|4384.908|<small><= 4141 ✅<br><= 6000 🔶<br> > 6000 🔴</small>|<small><= 4141 ✅ <br><= 6000 🔶 🠴<br> > 6000 🔴 </small>|🔶|
|🚀|Standing out|1000|375.708|0.376|<small><= 0.3 ✅<br><= 0.33 🔶<br> > 0.33 🔴</small>|<small><= 0.3 ✅ <br><= 0.33 🔶 <br> > 0.33 🔴 🠴</small>|🔴|


## Extra metrics

You can add `extraMetrics` columns too. In its `metrics` array you can define which columns you want. If you set `ignoreSingleRuns` to `true`, it wont show values on rows, where runCount is 1.
|Name|Runs|Total (ms)|Average (ms)|Min|Max|Mean|Median|Std deviation|
|:--|--:|--:|--:|--:|--:|--:|--:|--:|
|Sorting arrays|4000|1801.169|0.450|0.305|1.632|0.969|0.401|0.143|
|Rotating other things|1000|2143.992|2.144|1.757|4.585|3.171|2.082|0.314|
|Rotating arrays|1000|2021.054|2.021|1.748|3.549|2.648|2.000|0.156|
|Proving NP==P|1|4384.908|4384.908|-|-|-|-|-|
|Standing out|1000|375.708|0.376|0.299|0.762|0.531|0.360|0.058|


## Ungrouped benches

|Name|Runs|Total (ms)|Average (ms)|
|:--|--:|--:|--:|
|Ungrouped 1|1000|2290.916|2.291|
|Ungrouped 2|1000|2101.089|2.101|



---

This is the `afterTables`. This behaves the same as `description`, it just puts this at the bottom of the markdown.
Here its defined with a simple string.

Check out the Github Action, which comments a markdown like this on PRs: [pr_benchmarks.yml](https://github.com/littletof/prettyBenching/blob/docs/prettyBenchmarkDown/pr_benchmarks.yml).

You can find an example repo that uses it [here](https://github.com/littletof/pretty-benching-action/pull/2)

