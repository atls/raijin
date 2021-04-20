"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@atlantis-lab/config");
module.exports = {
    '*.{js,ts,tsx,yml,yaml,json,graphql,md}': [
        `prettier --write --config ${config_1.PRETTIER_CONFIG_PATH} --ignore-path ${config_1.PRETTIER_IGNORE_PATH}`,
        'git add',
    ],
    '*.{ts,tsx}': ['bash -c "tsc --noEmit"'],
    '*.{js,jsx,ts,tsx}': [
        `eslint --fix --config ${config_1.ESLINT_CONFIG_PATH}`,
        `jest --config ${config_1.JEST_CONFIG_PATH} --bail --findRelatedTests`,
        'git add',
    ],
};
