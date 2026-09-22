# Project formatting

Formats project files through Prettier, using the project's configuration and Raijin's supported defaults.

## Usage

```sh
yarn format
yarn format src/index.ts
```

## Responsibilities

Explicit targets are resolved from the invocation directory. With no targets, the command selects project sources. Generated output and configured ignores remain excluded. Missing explicit targets and formatter failures return a nonzero result. Read-only formatting verification is exposed through `yarn check --verify`.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/format
```
