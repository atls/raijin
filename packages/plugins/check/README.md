# Raijin check policy

`yarn check` verifies the full active Yarn project in this order: Format,
Lint, TypeCheck, unit tests, and integration tests. It repairs formatting as it
runs. A nonzero result from any capability makes the command fail; later
capabilities still run so their diagnostics remain visible.

`yarn check --verify` applies the same policy without writing formatted files.
Formatting drift fails verification. Explicit file or directory targets remain
available for local focused Format, Lint, and TypeCheck checks, for example
`yarn check packages/app/src`. The focused path does not run project tests.

The Git pre-commit entry remains `yarn commit staged`. It uses `lint-staged` to
operate on the Git index with the nearest checked-in project configuration,
including its transaction and partially staged file handling. It is not a
full-project `check` invocation.
