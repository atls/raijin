# Project tests

Discovers project tests and runs them through Node's built-in test runner.

## Usage

```sh
yarn test
yarn test unit
yarn test integration
yarn test unit --target packages/app --watch
```

## Responsibilities

Files under an `integration` directory belong to the integration scenario; other matching test files belong to the unit scenario. The general command runs both. Explicit targets, project ignore patterns and the active project boundary control discovery. Watch mode uses the runner's lifecycle rather than a separate worker protocol. Test failures, discovery failures and reporter failures produce a nonzero result.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/test
```
