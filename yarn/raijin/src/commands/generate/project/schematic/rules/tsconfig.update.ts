import type { Rule }                      from '@angular-devkit/schematics'
import type { Tree }                      from '@angular-devkit/schematics'

import type { Options }                   from './tsconfig.update.interfaces.js'

import stripJsonComments                  from 'strip-json-comments'

import { applyTypeScriptCompilerOptions } from '@atls/raijin/config/typescript'
import { typescriptDefaults }             from '@atls/raijin/config/typescript'

const TSCONFIG_PATH = 'tsconfig.json'

const readTypeScriptConfig = (host: Tree): Record<string, unknown> => {
  const content = host.read(TSCONFIG_PATH)?.toString('utf8') ?? '{}'

  return JSON.parse(stripJsonComments(content)) as Record<string, unknown>
}

export const updateTsConfigRule = (_options: Options): Rule =>
  (host: Tree): Tree => {
    const content = `${JSON.stringify(
      applyTypeScriptCompilerOptions(
        readTypeScriptConfig(host),
        typescriptDefaults.compilerOptions as Record<string, unknown>
      ),
      null,
      2
    )}\n`

    if (host.exists(TSCONFIG_PATH)) {
      host.overwrite(TSCONFIG_PATH, content)
    } else {
      host.create(TSCONFIG_PATH, content)
    }

    return host
  }
