# Library artifacts

Builds a library workspace from `src` using TypeScript and the project's configuration.

## Usage

```sh
yarn library build
yarn library build --target lib
```

## Responsibilities

The default output directory is `dist`. A successful build produces JavaScript and declaration files before replacing the previous completed artifact. Failed compilation must not destroy the previous complete output. The packing hook applies the selected package metadata and rejects an incomplete library artifact; it does not publish packages.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/library
yarn test integration --target packages/plugins/library
```
