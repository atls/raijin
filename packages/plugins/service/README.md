# Node application lifecycle

Builds, develops and starts an ESM Node application in the selected workspace.

## Usage

```sh
yarn service build
yarn service dev
yarn service start
```

## Responsibilities

Webpack owns compilation. A build stages a complete artifact before replacing `dist`; start requires that completed artifact. Development watches compilation and restarts the application after successful rebuilds. Managed Node execution supplies the project environment, loader and process cleanup. Diagnostics and application output are presented without hiding a failing result.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/service
yarn test integration --target packages/plugins/service
```
