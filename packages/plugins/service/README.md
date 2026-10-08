# Node application lifecycle

Builds, develops and starts an ESM Node application in the selected workspace.

## Usage

```sh
yarn service build
yarn service build --standalone
yarn service dev
yarn service start
```

## Responsibilities

Webpack owns compilation. A build stages a complete artifact before replacing `dist`; start requires that completed artifact. Development watches compilation and restarts the application after successful rebuilds. Managed Node execution supplies the project environment, loader and process cleanup. Diagnostics and application output are presented without hiding a failing result.

`--standalone` bundles declared package dependencies into `dist` so the built service can run outside the Yarn project. Copy the entire `dist` directory, including chunks created by dynamic imports, emitted assets, and its ESM `package.json`, and run `index.js` from that directory. Node.js built-ins remain provided by Node. This mode rejects `tools.service.externals`; the default build keeps its existing external dependency behavior.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/service
yarn test integration --target packages/plugins/service
```
