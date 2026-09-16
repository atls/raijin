# @atls/raijin

Raijin provides project commands and an optional ESLint flat configuration.

The new public install/update path uses one exact published package and checked `yarn.js` runtime pair. Published `@atls/raijin@0.7.0` still provides only `yarn.mjs`; until a schemaVersion 2 release is published, the initializer rejects that historical manifest without changing the active runtime.

## Git hooks

Local Yarn installation and successful Raijin runtime update install repository hooks through the pinned Husky 9.1.7 package. Husky owns `.config/husky/_` and the relative Git `core.hooksPath`; Raijin owns only its marked entry files for `pre-commit`, `commit-msg`, and `prepare-commit-msg`. An unrelated hook stays untouched, while an unowned file with one of those names stops installation with a conflict. CI, image packaging, and `HUSKY=0` skip hook installation. In a new directory without `.git`, initialize Git and run `yarn install` to activate hooks before the first commit.

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
