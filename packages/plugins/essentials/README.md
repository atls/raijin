# Raijin updates

Provides the `yarn set version atls` entry point for updating the verified Raijin package and checked runtime together.

## Usage

```sh
yarn set version atls
```

## Responsibilities

The command finds the invoking package boundary and delegates to the public Raijin updater. Version selection, artifact validation and activation are owned by `@atls/raijin`; this plugin does not implement another updater.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/raijin/src/initializer
yarn test integration --target packages/raijin/src/installation
```
