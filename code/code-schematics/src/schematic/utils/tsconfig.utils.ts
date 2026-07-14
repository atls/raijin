/* eslint-disable */

import { applyTypeScriptCompilerOptions } from '@atls/raijin/config/typescript'

import { updateJsonInTree }               from './json.utils.js'

export const updateTsConfigInTree = (compilerOptions: object) =>
  updateJsonInTree('tsconfig.json', (tsconfig) =>
    applyTypeScriptCompilerOptions(tsconfig, compilerOptions as Record<string, unknown>))
