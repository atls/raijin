# Project and icon generation

Exposes project scaffolding and SVG-to-component generation through the checked Yarn runtime.

## Usage

```sh
yarn generate project --type project
yarn generate project --type library
yarn ui icons generate
```

## Responsibilities

Project generation delegates to the installed Angular collection and preserves existing user files. Icon generation reads `icons/*.svg` with the project's `template.ts` and `replacements.ts`, writes the managed components and index in `src`, then formats and lints the result. Duplicate component names and provider failures are reported as failures. `--native` selects SVGR's native component mode.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/generate
yarn test integration --target packages/raijin/src/infrastructure/generation/project
```
