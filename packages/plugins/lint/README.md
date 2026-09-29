# Project linting

Runs ESLint with the invoking project's configuration and reports its diagnostics and exit status.

## Usage

```sh
yarn lint
yarn lint --fix src/index.ts
yarn lint --cache
```

## Responsibilities

ESLint owns config loading, target expansion, ignores, fixes and cache behavior. Raijin supplies the invocation boundary and its defaults when no project config exists. At a PnP project root, Raijin also passes Yarn's declared `pnpIgnorePatterns` to ESLint so an independent nested project remains under its own checks. Workspace invocations retain their own target scope. A project config is not silently replaced with Raijin rules. Missing targets and provider errors remain failures.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/lint
```
