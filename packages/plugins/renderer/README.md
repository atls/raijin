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

Under Yarn PnP, build and dev pass Next's documented
[`--webpack` option](https://nextjs.org/docs/app/api-reference/cli/next). Raijin
does not change the project's Yarn unplug settings and preserves the Next CLI
exit status.

When Next.js and Raijin share one Yarn project, declare `"type": "module"` in
the root `package.json` before connecting Raijin. This sets the [Node.js package
scope](https://nodejs.org/api/packages.html#type) for `.js` files. In a
monorepo, keep the application's `tsconfig.json` separate from the root
TypeScript project. Raijin does not edit Next application sources.

Next owns its internal development-server workers; renderer adds no second
supervisor. Normal CLI cancellation with SIGINT or SIGTERM shut down the tested
server and released its port. Force-killing an internal worker is not the
supported stop path.

The former renderer-specific tunnel and certificate-path options are removed.
Use Next's public options for supported development-server behavior. UI-library
and CSS-tooling compatibility is tracked separately in
[the UI/CSS integration task](https://github.com/atls/raijin/issues/973).
