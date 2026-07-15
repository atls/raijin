import type { Rule }                      from '@angular-devkit/schematics'

import { typescriptDefaults as tsconfig } from '@atls/raijin/config/typescript'

import { updateTsConfigInTree }           from '../utils/tsconfig.utils.js'

interface UpdateTsConfigRuleOptions extends Record<string, string | undefined> {
  cwd?: string
}

export const updateTsConfigRule = (_options: UpdateTsConfigRuleOptions): Rule =>
  async (): Promise<ReturnType<typeof updateTsConfigInTree>> =>
    updateTsConfigInTree(tsconfig.compilerOptions)
