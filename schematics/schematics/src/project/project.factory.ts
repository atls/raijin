import type { Source }          from '@angular-devkit/schematics'

import { readFileSync }         from 'node:fs'
import { join }                 from 'node:path'

import { MergeStrategy }        from '@angular-devkit/schematics'
import { strings }              from '@angular-devkit/core'
import { apply }                from '@angular-devkit/schematics'
import { mergeWith }            from '@angular-devkit/schematics'
import { move }                 from '@angular-devkit/schematics'
import { template }             from '@angular-devkit/schematics'
import { url }                  from '@angular-devkit/schematics'
import { chain }                from '@angular-devkit/schematics'

import { updateTsConfigInTree } from '@atls/schematics-utils'
import tsconfig                 from '@atls/config-typescript'

const updateTsConfig = updateTsConfigInTree({
  ...tsconfig.compilerOptions,
  module: 'esnext',
})

const generateCommon = (options: any): Source =>
  apply(url('./files/common'), [
    template({
      ...strings,
      ...options,
      dot: '.',
    }),
    move('./'),
  ])

const generateProjectSpecifiec = (options: any): Source => {
  // eslint-disable-next-line
  const { name: projectName } = JSON.parse(readFileSync(join(options.cwd, 'package.json'), 'utf-8'))

  // eslint-disable-next-line
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

// eslint-disable-next-line
export const main = (options: any) =>
  // @ts-expect-error any
  chain([
    mergeWith(generateCommon(options), MergeStrategy.Overwrite),
    mergeWith(generateProjectSpecifiec(options), MergeStrategy.Overwrite),
    updateTsConfig,
  ])
