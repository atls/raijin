# @atls/raijin

Raijin provides project commands and an optional ESLint flat configuration.

Raijin projects use ESM. Initialization and update stop before changing an existing project unless its `package.json` declares `"type": "module"`.

The public install/update path selects npm's published `latest` version and requires the exact matching GitHub release to contain an uploaded `yarn.js` asset with a SHA-256 digest. The package's `gitHead` must match the release tag commit; Corepack uses the Yarn version from that commit's root `package.json`. A missing or mismatched asset is rejected before the active runtime changes. A generated release manifest is not needed.

## Git hooks

Local installation and runtime updates install Git hooks through Husky. Husky owns `.config/husky/_` and the relative `core.hooksPath`; Raijin adds only its marked `pre-commit`, `commit-msg`, and `prepare-commit-msg` entries. Existing hooks are not overwritten: a conflict stops installation before hook state changes. Hooks are skipped in CI, image packaging and with `HUSKY=0`. In a new directory, run `git init` and then `yarn install` to activate them before the first commit.

## ESLint configuration

`yarn lint` uses Raijin's default rules only when ESLint finds no project `eslint.config.*`. If your project has a configuration file, ESLint loads that file without Raijin injecting its defaults. Keep an existing configuration as the project's source of truth; no Raijin import is required.

To opt in to Raijin's rules, create or update `eslint.config.js` in the project root:

```js
import { eslintconfig } from '@atls/raijin/eslint'

export default [
  ...eslintconfig,
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
]
```

Configuration order is explicit: Raijin defaults come first, and the project's rule overrides follow them. If you compose other shareable configurations, place them deliberately and avoid defining the same plugin namespace with different implementations for the same files. ESLint owns configuration discovery and merging.

## Source map

- `src/commands`: command input, workspace selection and invocation composition
- `src/config`: ESLint, Prettier and TypeScript configuration
- `src/execution`: managed Node applications, ordinary processes and their shared subprocess implementation
- `src/filesystem`: project file discovery and native paths
- `src/generation`: project scaffolding
- `src/initializer` and `src/installation`: public initialization, update and hook installation
- `src/project` and `src/yarn`: project metadata and native Yarn execution
- `src/runtime`: runtime delivery, loaders and tool entrypoints

Tests live in the `tests` directory of the capability they verify. Package-wide execution and installation checks live in the package's own `tests` directory. Production files stay next to their capability; related contracts are grouped in local `interfaces` directories.
