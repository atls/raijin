# @atls/raijin

Raijin provides project commands and an optional ESLint flat configuration.

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
