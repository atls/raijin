# Project formatting

Formats project files through Prettier, using the project's configuration and Raijin's supported defaults.

## Usage

```sh
yarn format
yarn format src/index.ts
```

## Responsibilities

Explicit targets are resolved from the invocation directory. With no targets, the command selects project sources. Generated output, configured ignores, and files matched by `.gitignore` files from the invocation directory down to each file remain excluded, including explicitly named targets. Nested `.gitignore` files affect only their own subtrees; user-authored declaration files remain format candidates unless ignored. Missing explicit targets and formatter failures return a nonzero result. Read-only formatting verification is exposed through `yarn check --verify`.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/format
```
