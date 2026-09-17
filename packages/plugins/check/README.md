# Raijin check policy

`yarn check` verifies the full active Yarn project in this order: Format,
Lint, TypeCheck, unit tests, and integration tests. It repairs formatting as it
runs. A nonzero result from any capability makes the command fail; later
capabilities still run so their diagnostics remain visible.

`yarn check --verify` applies the same policy without writing formatted files.
Formatting drift fails verification. `yarn check packages/app` runs all five
capabilities for that directory. Format, Lint, and test discovery stay within
the requested directory; TypeCheck uses its nearest `tsconfig.json` as a whole
TypeScript project, including that configuration's roots and references. A
single-file target stays focused on Format, Lint, and file TypeCheck.

`yarn check --verify --since <ref>` uses Yarn's Git change detection to select
changed workspaces and recursive dependents. A root, lockfile, or another
nonignored project-level change runs one full-project pass; an empty comparison
or files excluded by `changesetIgnorePatterns` remain a no-op. The Git ref and
merge-base history must already exist in the checkout. This entry never writes
formatted files, creates a GitHub Check Run, or interprets a GitHub event.

The Git pre-commit entry remains `yarn commit staged`. It uses `lint-staged` to
operate on the Git index with the nearest checked-in project configuration,
including its transaction and partially staged file handling. It is not a
full-project `check` invocation.
