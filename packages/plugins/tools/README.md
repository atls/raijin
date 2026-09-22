# Yarn lifecycle integration

Connects Raijin to Yarn's installation and script-environment hooks. This private plugin registers no CLI command.

## Usage

After installation, the plugin invokes the installed `raijin-hooks` binary when repository hooks are applicable. During script setup, it applies the managed Node loader and asks Yarn to create wrappers for the selected runtime.

## Responsibilities

Yarn owns package resolution and wrapper creation. The public Raijin package owns hook installation and loader configuration. The plugin must preserve unrelated environment state and must not choose an arbitrary package when multiple Raijin installations are resolved.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/tools
```
