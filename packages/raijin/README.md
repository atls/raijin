# @atls/raijin

Raijin provides project commands and an optional ESLint flat configuration.

The public install/update path selects npm's published `latest` version and requires the exact matching GitHub release to contain an uploaded `yarn.js` asset with a SHA-256 digest. The package's `gitHead` must match the release tag commit; Corepack uses the Yarn version from that commit's root `package.json`. Published `@atls/raijin@0.7.0` still provides only `yarn.mjs`, so the new installer refuses that release before changing the active runtime. A generated release manifest is not needed.

## Git hooks

Local Yarn installation and successful Raijin runtime update install repository hooks through the pinned Husky 9.1.7 package. Husky owns `.config/husky/_` and the relative Git `core.hooksPath`; Raijin owns only its marked entry files for `pre-commit`, `commit-msg`, and `prepare-commit-msg`. Other hook files are not overwritten. If switching from Git's current hook directory would leave an active existing hook behind, installation stops with an explicit conflict before changing hook state; an unowned Raijin-name entry also conflicts. CI, image packaging, and `HUSKY=0` skip hook installation. In a new directory without `.git`, initialize Git and run `yarn install` to activate hooks before the first commit.

## ESLint configuration

`yarn lint` uses Raijin's default rules only when ESLint finds no project `eslint.config.*`. If your project has a configuration file, ESLint loads that file without Raijin injecting its defaults. Keep an existing configuration as the project's source of truth; no Raijin import is required.

To opt in to Raijin's rules, create or update `eslint.config.mjs` in the project root:

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
