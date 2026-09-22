# Yarn execution

Runs the repository's selected Yarn runtime and preserves its command arguments, project directory and process environment. Yarn remains responsible for package resolution, installation and workspace semantics.

The initializer supplies its command runner through this capability. Run `yarn test unit --target packages/raijin/src/yarn` for launcher and command behavior.
