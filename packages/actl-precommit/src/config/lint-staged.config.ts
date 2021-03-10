import {
  PRETTIER_CONFIG_PATH,
  PRETTIER_IGNORE_PATH,
  ESLINT_CONFIG_PATH,
  JEST_CONFIG_PATH,
} from '@atlantis-lab/config'

module.exports = {
  '*.{js,ts,tsx,yml,yaml,json,graphql,md}': [
    `prettier --write --config ${PRETTIER_CONFIG_PATH} --ignore-path ${PRETTIER_IGNORE_PATH}`,
    'git add',
  ],
  '*.{ts,tsx}': ['bash -c "tsc --noEmit"'],
  '*.{js,jsx,ts,tsx}': [
    `eslint --fix --config ${ESLINT_CONFIG_PATH}`,
    `jest --config ${JEST_CONFIG_PATH} --bail --findRelatedTests`,
    'git add',
  ],
};
