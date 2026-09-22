# Project generation

Exposes project scaffolding through the checked Yarn runtime.

## Usage

```sh
yarn generate project --type project
yarn generate project --type library
```

## Responsibilities

Project generation delegates to the installed Angular collection and preserves existing user files. The project and library variants share the neutral baseline owned by that collection.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/generate
yarn test integration --target packages/raijin/src/generation/project
```
