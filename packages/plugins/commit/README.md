# Commit Plugin

The private plugin registers `yarn commit message`, `yarn commit message lint`,
and `yarn commit staged`. Message preparation, commitlint validation, and staged
verification live with their command owner instead of separate code and CLI UI
workspaces.

## Message Preparation

`yarn commit message` renders its Ink prompt inside this plugin and writes the
selected conventional commit fields to the requested edit-message file. It uses
the same commitlint-backed policy as `yarn commit message lint` before writing.
The prompt offers the accepted scopes derived from the current Yarn project and
starts with the required scope selected. If commitlint rejects the composed
message, its native report is shown and the prompt reopens with every entered
value preserved for correction. Only a valid message reaches the edit file.

Git's prepare-commit-msg source argument exits before project resolution or
interactive work. Cancellation returns a non-zero result without changing the
edit file. Commitlint, prompt, and file-write failures remain observable and
non-zero.

## Message Validation

`yarn commit message lint` uses the repository-pinned commitlint packages directly.
The plugin adds the current Yarn workspace names and scopes to the retained commit
policy. It passes the resolved Yarn project cwd to commitlint, which retains Git-root
and edit-message discovery, parsing, lint evaluation, and diagnostic formatting. The
command writes the native report and returns a non-zero result when any message is
invalid.

## Staged Checks

Keep the Git pre-commit route `yarn commit staged`. Every independent Yarn
project declares its required checks through an ordinary lint-staged
configuration. Repositories use a checked-in root configuration, and nested independent
projects must own their nearest configuration. All lint-staged native formats
are supported, including the `lint-staged` field in `package.json`.

Raijin invokes the public lint-staged 17.5.0 API once with
`{ concurrent: false, maxArgLength: 4095 }`. The provider parses command arguments
without shell evaluation. It does not provide
`config`, `configPath`, or `cwd`. lint-staged retains native configuration
discovery and grouping, staged-file selection, task ordering, argument parsing
and chunking, partial staging, backup, rollback, and restaging. Missing required
project coverage must be rejected by that project's checked-in configuration;
an absent command, provider `false` result, or provider exception remains a
non-zero hook result.

The Yarn patch for lint-staged defers `createRequire(import.meta.url)` until
configuration resolution. The standalone CommonJS plugin has no module URL
during factory initialization; the provider's existing resolution fallback
remains inside its own `try`/`catch`. TypeScript uses the official package types.

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
yarn typecheck
yarn lint packages/plugins/commit/src
yarn workspace @atls/yarn-plugin-commit build
yarn raijin:check
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
renames, deletions, literal paths, and argument chunking. Message tests cover the
shared commitlint policy, resolved-project edit-file lookup, early source bypass,
correction with preserved input, cancellation, and provider failures. A disposable
Git/Yarn project using the checked runtime provides the final PTY/edit-file proof for
interactive preparation and separate validation.
