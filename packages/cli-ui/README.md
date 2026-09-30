# CLI presentation

Shared terminal presentation for Raijin commands. This private package renders errors, stack traces and TypeScript diagnostics; it does not execute commands or decide their result.

## Usage

Import `ErrorInfo`, `StackTrace`, `TypeScriptDiagnostic` and `renderStatic` from `@atls/cli-ui`. Supply the command's working directory and destination stream so paths, terminal width and colors match the caller.

## Responsibilities

Rendering produces a bounded frame and unmounts its Ink tree. Process execution, logging policy and command exit codes stay with the calling capability.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/cli-ui
```
