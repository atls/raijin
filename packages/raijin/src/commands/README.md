# Command invocation

Connects a registered Yarn command to its selected project and workspace.

`input` resolves the command's target arguments. `invocation/scope` establishes the project and workspace once; `composition` supplies the process, application and Yarn capabilities used by plugins. The `yarn` and `path` implementations preserve provider-owned execution and path conversion.

Plugins consume the exports of `@atls/raijin/commands`; they do not repeat project discovery or reach into a sibling package's source tree.

Run `yarn test unit --target packages/raijin/src/commands` for target resolution, command composition and native Yarn execution.
