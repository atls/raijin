# Application images

Builds an application image from the original Yarn project root and the selected workspace, using the installed `pack` CLI.

## Usage

```sh
yarn image pack --registry example/ --tag-policy explicit --tags development --json
```

## Responsibilities

The workspace must have a name and a nonempty ordinary `start` script; the project must select its checked runtime with `yarnPath`. `packConfiguration` can choose the builder and buildpack. Native `project.toml` controls context filtering. Explicit tags do not require Git; revision-based tags require a valid Git revision. Without `--publish` the result identifies a local image. Publication requires `--publish` and a provider-reported digest. The command neither downloads pack nor creates a separate export directory.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/image
yarn test integration --target packages/plugins/image
```
