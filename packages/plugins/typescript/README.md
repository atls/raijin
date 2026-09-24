# TypeScript verification

Checks TypeScript without emitting build artifacts.

## Usage

```sh
yarn typecheck
yarn typecheck src/index.ts
```

## Responsibilities

Without targets, the command checks the selected TypeScript project. Explicit files retain the applicable project compiler options. TypeScript owns configuration inheritance, references, includes, excludes and `rootDir`. Raijin adds invocation scope, diagnostics and the explicit `typecheckSkipLibCheck` policy. An ambiguous source root for a package export remains TypeScript's diagnostic; Raijin does not infer or rewrite the project's `rootDir`. Missing project configuration and compiler/provider failures remain observable failures.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/typescript
```
