This is mainly a maintenance module, its main purpose is to have an example output, so the progression of the looks can be observed.

The main dataset shouldt be changed, so the example stays consistent. There may be reasons to change, for example to showcase a new option better.
To create a new dataset run:

```ts
deno run --allow-read=./docs/showcase --allow-write=./docs/showcase --allow-hrtime --unstable .\docs\showcase\showcase_create.ts
```

If you have a dataset, than you can run this, to produce the generated showcase file.

```ts
deno run --allow-read=./docs/showcase --allow-write=./docs/showcase --allow-hrtime --unstable .\docs\showcase\showcase_read.ts
```

### TODO

A helper script, to make the docs images more easily and to keep them up-to-date.
