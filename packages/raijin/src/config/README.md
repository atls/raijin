# Tool configuration

Provides the retained ESLint, Prettier and TypeScript defaults and project configuration adapters. Each tool keeps its own discovery and merge semantics; Raijin supplies defaults only where the command's established contract allows them.

Public opt-in configuration exports are declared by the package manifest. Tests belong to the tool and configuration operation they verify.

The default ESLint rules keep project-backed TypeScript linting for application
sources. Nested `eslint.config.mjs` and `postcss.config.mjs` files are linted
without TypeScript project matching because application tsconfig files commonly
exclude those tooling scripts.

Run `yarn test unit --target packages/raijin/src/config` to check project overrides, default rules and TypeScript configuration materialization.
