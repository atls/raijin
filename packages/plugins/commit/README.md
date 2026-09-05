# Commit Plugin

The private plugin registers `yarn commit message`, `yarn commit message lint`,
and `yarn commit staged`. This change affects staged checks only; message
preparation and validation retain their existing behavior.

## Staged Checks

Keep the Git pre-commit route `yarn commit staged`. Every independent Yarn
project declares its required checks through an ordinary lint-staged
configuration. Repositories use a checked-in root configuration, and nested independent
projects must own their nearest configuration. All lint-staged native formats
are supported, including the `lint-staged` field in `package.json`.

Raijin invokes the public lint-staged 15.2.9 API once with
`{ concurrent: false, maxArgLength: 4095, shell: false }`. It does not provide
`config`, `configPath`, or `cwd`. lint-staged retains native configuration
discovery and grouping, staged-file selection, task ordering, argument parsing
and chunking, partial staging, backup, rollback, and restaging. Missing required
project coverage must be rejected by that project's checked-in configuration;
an absent command, provider `false` result, or provider exception remains a
non-zero hook result.

Yarn's `--cwd` changes the command context without changing `process.cwd()`.
The staged command enters `invocation.executionCwd` for the awaited transaction
and restores its original process directory in `finally`. This command-local
adaptation does not change the public invocation API, process environment, or
lint-staged's per-configuration working directories.

## Verification

Run the hermetic source contract and package checks with the repository-managed
commands:

```sh
yarn test unit --target packages/plugins/commit
yarn typecheck packages/plugins/commit/src
yarn lint packages/plugins/commit/src
```

Run the plugin's integration test against the packed package and checked runtime:

```sh
yarn test integration --target packages/plugins/commit
```

The test packs this checkout's `@atls/raijin` package and copies its checked Yarn
runtime into a temporary Git repository. Normal commits exercise the installed
hook, required project configuration, backend TypeScript 5.9.3 under PnP, and
an independent node_modules client with TypeScript 6.0.3 and Jest 29.7.0.
The client has no Raijin dependency or synthetic `typecheck` script.
The unit tests cover transaction mechanics, including rollback, partial staging,
renames, deletions, literal paths, and argument chunking.
