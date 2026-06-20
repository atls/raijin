import type { Rule }                     from '@angular-devkit/schematics'

import { getCodeRuntimeCompilerOptions } from '../../helpers/index.js'
import { updateTsConfigInTree }          from '../utils/tsconfig.utils.js'

interface UpdateTsConfigRuleOptions extends Record<string, string | undefined> {
  cwd?: string
  runtimeCwd?: string
}

export const updateTsConfigRule = (options: UpdateTsConfigRuleOptions): Rule =>
  async (): Promise<ReturnType<typeof updateTsConfigInTree>> => {
    const compilerOptions = await getCodeRuntimeCompilerOptions(
      options.runtimeCwd ?? options.cwd ?? process.cwd()
    )

    return updateTsConfigInTree(compilerOptions)
  }
