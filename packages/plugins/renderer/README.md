# Next.js lifecycle

Run the Next.js CLI declared by the selected workspace through Raijin's Yarn
execution environment:

```sh
yarn renderer dev --hostname 127.0.0.1 --port 3000
yarn renderer build
yarn renderer start --hostname 127.0.0.1 --port 3000
```

Commands use the selected workspace as Next's project directory. An explicit
directory and other Next CLI arguments are forwarded unchanged. Configuration,
environment files, static assets and build output remain owned by Next.js.
Production start uses the ordinary Next build output; no standalone directory or
Raijin entrypoint is generated.

Build and development use the documented Webpack option because Turbopack does
not support Yarn PnP. With Next 16.3.5, Node 24.20.0 and Yarn 4.14.1, unpack Next
through Yarn to avoid its CommonJS hook failing inside the PnP ZIP loader:

```sh
yarn unplug next
```

Yarn records the unpacking in the root manifest's `dependenciesMeta`. The project
keeps PnP and its ESM loader. Raijin does not edit Next's sources or silently
change installation settings. Commands preserve the Next CLI exit status.

For `eslint-config-next@16.3.6`, the checked Yarn runtime supplies the missing
`next` peer through Yarn's package-extension hook. This lets the stock Next
ESLint configuration resolve the project's own Next installation under PnP;
Raijin does not rewrite the project's ESLint configuration.

Next owns its internal development-server workers. In Next 16.3.5, forcibly
killing a dev worker can end the provider with exit code zero; forcibly killing
its supervising CLI can leave a worker alive. Renderer does not add a second
worker supervisor. Normal CLI cancellation with SIGINT or SIGTERM shuts down
the tested server and releases its port.

The former renderer-specific tunnel and certificate-path options are removed.
Use Next's public options for supported development-server behavior. UI-library
and CSS-tooling compatibility is tracked separately in
[the UI/CSS integration task](https://github.com/atls/raijin/issues/973).
