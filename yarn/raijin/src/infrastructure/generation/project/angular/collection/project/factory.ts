import type { Rule }     from '@angular-devkit/schematics'
import type { Tree }     from '@angular-devkit/schematics'

import type { Options }  from './factory.interfaces.js'

import { strings }       from '@angular-devkit/core'
import { apply }         from '@angular-devkit/schematics'
import { chain }         from '@angular-devkit/schematics'
import { filter }        from '@angular-devkit/schematics'
import { mergeWith }     from '@angular-devkit/schematics'
import { move }          from '@angular-devkit/schematics'
import { template }      from '@angular-devkit/schematics'
import { url }           from '@angular-devkit/schematics'
import stripJsonComments from 'strip-json-comments'

const TSCONFIG_PATH = 'tsconfig.json'

const serializeJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`

const updateTypeScriptConfig = (options: Options): Rule =>
  (tree: Tree): Tree => {
    const content = tree.read(TSCONFIG_PATH)?.toString('utf8') ?? '{}'
    const config = JSON.parse(stripJsonComments(content)) as Record<string, unknown>
    const existingCompilerOptions =
      typeof config.compilerOptions === 'object' && config.compilerOptions !== null
        ? config.compilerOptions
        : {}
    const updatedConfig = {
      ...config,
      compilerOptions: {
        ...options.typescriptCompilerOptions,
        ...existingCompilerOptions,
      },
    }

    if (tree.exists(TSCONFIG_PATH)) {
      tree.overwrite(TSCONFIG_PATH, serializeJson(updatedConfig))
    } else {
      tree.create(TSCONFIG_PATH, serializeJson(updatedConfig))
    }

    return tree
  }

const projectSource = (tree: Tree, options: Options) =>
  apply(url('../templates/common'), [
    template({
      ...strings,
      ...options,
      dot: '.',
    }),
    move('/'),
    filter((path) => !tree.exists(path)),
  ])

export const main = (options: Options): Rule =>
  (tree: Tree) =>
    chain([updateTypeScriptConfig(options), mergeWith(projectSource(tree, options))])
