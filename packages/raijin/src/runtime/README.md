# Runtime

Contains the tool entrypoints exported by the public package, checked-runtime download and verification, and managed Node loader setup.

- `node` provides loader registration and bootstrap
- `prettier` keeps syntax parsing and import/export alignment on Prettier, while Perfectionist orders only eligible import runs
- the tool entrypoint files resolve the package's installed TypeScript, ESLint and Webpack implementations
- `release.ts` and `download.ts` verify the selected release asset before activation

Run `yarn test unit --target packages/raijin/src/runtime` for these contracts. `yarn raijin:check:runtime` rebuilds the checked CLI and verifies byte equality, command help and plugin inventory.
