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

After copying the complete `dist` directory to its destination, run it from the destination's parent directory:

```sh
node dist/index.js
```

## Shared production runtime

A monorepo can declare `@atls/raijin` once at its root and use the service
commands from each application workspace. If an application's production
`start` script calls `yarn service start`, Raijin is a runtime dependency:
declare it in the root `dependencies`, not only in `devDependencies`.

Production packaging must retain both the runtime-owning root workspace and
the selected application. For a root package named `platform` and a service
named `@platform/api`, run:

```sh
yarn workspace @platform/api run build
yarn workspaces focus --production platform @platform/api
yarn workspace @platform/api run start
```

The application scripts can use `yarn service build --standalone` and
`yarn service start` without declaring Raijin again in the application.
Use the same root runtime for other service workspaces, focusing the root and
the chosen service for each production artifact. Retain the checked-in Yarn
runtime, project manifests, Yarn configuration and production installation
alongside the complete service build output.

Focusing only the service removes the root runtime from its dependency graph.
Moving Raijin to root `dependencies` alone does not prevent that removal.
A root dev dependency is also excluded by production focus even when the root
workspace is selected. Packaging integrations must preserve this shared
runtime contract before invoking the application's start script.

Standalone output can also be executed directly by Node as described above.
Its independence from application dependencies does not remove the runtime
needed when the chosen launch command itself uses Raijin.

## Verification

Run from the repository root:

```sh
yarn test unit --target packages/plugins/service
yarn test integration --target packages/plugins/service
```
