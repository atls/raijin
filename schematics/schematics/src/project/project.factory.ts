import { readFileSync }         from 'node:fs'
import { join }                 from 'node:path'

import { MergeStrategy }        from '@angular-devkit/schematics'
import { Source }               from '@angular-devkit/schematics'
import { strings }              from '@angular-devkit/core'
import { apply }                from '@angular-devkit/schematics'
import { mergeWith }            from '@angular-devkit/schematics'
import { move }                 from '@angular-devkit/schematics'
import { template }             from '@angular-devkit/schematics'
import { url }                  from '@angular-devkit/schematics'
import { chain }                from '@angular-devkit/schematics'

import tsconfig                 from '@atls/config-typescript'
import { updateTsConfigInTree } from '@atls/schematics-utils'

const updateTsConfig = updateTsConfigInTree({
  ...tsconfig.compilerOptions,
  module: 'esnext',
})

const generateCommon = (options): Source =>
  apply(url('./files/common'), [
    template({
      ...strings,
      ...options,
      dot: '.',
    }),
    move('./'),
  ])

const generateProjectSpecifiec = (options): Source => {
  const { name: projectName } = JSON.parse(readFileSync(join(options.cwd, 'package.json'), 'utf-8'))

    return apply(url(join('./files', options.type)), [
    template({
      ...strings,
      ...options,
      projectName,
      dot: '.',
    }),
    move('./'),
  ])
}

export const main = (options) =>
  chain([
    mergeWith(generateCommon(options), MergeStrategy.Overwrite),
    mergeWith(generateProjectSpecifiec(options), MergeStrategy.Overwrite),
    updateTsConfig,
  ])
