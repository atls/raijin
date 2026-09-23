# TypeScript verification

Checks TypeScript without emitting build artifacts.

## Usage

```sh
yarn typecheck
yarn typecheck src/index.ts
```

## Responsibilities

Without targets, the command checks the selected TypeScript project. Explicit files retain the applicable project compiler options. TypeScript owns configuration inheritance, references, includes and excludes. Raijin adds invocation scope, diagnostics and the explicit `typecheckSkipLibCheck` policy. When TypeScript reports an ambiguous project root for an export map and the config has no `rootDir`, Raijin retries the no-emit check using the config directory; it does not rewrite the config or change library output. Missing project configuration and compiler/provider failures remain observable failures.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/typescript
```
