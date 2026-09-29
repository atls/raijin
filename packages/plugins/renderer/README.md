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

For the verified PnP setup, build and development pass Next's documented
[`--webpack` option](https://nextjs.org/docs/app/api-reference/cli/next). A clean stock Next 16.3.6 App Router project built, started,
served CSS and hot-reloaded with Node 24.20.0 and the checked Yarn 4.18 runtime
without `yarn unplug next`. Existing project-owned Yarn unplug settings are not
rewritten by Raijin. Commands preserve the Next CLI exit status.

The single-project integration needs `"type": "module"` in its root
`package.json` before connecting Raijin; the checked Yarn runtime uses that
ESM package scope. In a monorepo, scope the root TypeScript project to its own
files and keep the Next workspace's `tsconfig.json` separate. Raijin does not
edit stock Next application sources to make either configuration work.

For `eslint-config-next@16.3.6`, the checked Yarn runtime supplies the missing
`next` peer through Yarn's package-extension hook. This lets the stock Next
ESLint configuration resolve the project's own Next installation under PnP;
Raijin does not rewrite the project's ESLint configuration.

Next owns its internal development-server workers; renderer adds no second
supervisor. Normal CLI cancellation with SIGINT or SIGTERM shut down the tested
server and released its port. Force-killing an internal worker is not the
supported stop path.

The former renderer-specific tunnel and certificate-path options are removed.
Use Next's public options for supported development-server behavior. UI-library
and CSS-tooling compatibility is tracked separately in
[the UI/CSS integration task](https://github.com/atls/raijin/issues/973).
