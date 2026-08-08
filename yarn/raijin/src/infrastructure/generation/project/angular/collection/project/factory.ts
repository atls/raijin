import type { Rule }           from '@angular-devkit/schematics'
import type { Tree }           from '@angular-devkit/schematics'

import type { GitIgnoreState } from './factory.interfaces.js'
import type { Options }        from './factory.interfaces.js'

import { MergeStrategy }       from '@angular-devkit/schematics'
import { strings }             from '@angular-devkit/core'
import { apply }               from '@angular-devkit/schematics'
import { chain }               from '@angular-devkit/schematics'
import { mergeWith }           from '@angular-devkit/schematics'
import { move }                from '@angular-devkit/schematics'
import { template }            from '@angular-devkit/schematics'
import { url }                 from '@angular-devkit/schematics'
import stripJsonComments       from 'strip-json-comments'

const GITIGNORE_PATH = '.gitignore'
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

const captureExistingGitIgnore = (state: GitIgnoreState): Rule =>
  (tree: Tree): Tree => {
    const content = tree.read(GITIGNORE_PATH)

    if (content) {
      state.content = Buffer.from(content)
    }

    return tree
  }

const restoreExistingGitIgnore = (state: GitIgnoreState): Rule =>
  (tree: Tree): Tree => {
    if (!state.content) {
      return tree
    }

    if (tree.exists(GITIGNORE_PATH)) {
      tree.overwrite(GITIGNORE_PATH, state.content)
    } else {
      tree.create(GITIGNORE_PATH, state.content)
    }

    return tree
  }

const projectSource = (path: string, options: Options) =>
  apply(url(path), [
    template({
      ...strings,
      ...options,
      dot: '.',
    }),
    move('/'),
  ])

export const main = (options: Options): Rule => {
  const gitIgnoreState: GitIgnoreState = {}
  const variantPath =
    options.scaffoldType === 'library' ? '../templates/libraries' : '../templates/project'

  return chain([
    captureExistingGitIgnore(gitIgnoreState),
    updateTypeScriptConfig(options),
    mergeWith(projectSource('../templates/common', options), MergeStrategy.Overwrite),
    mergeWith(projectSource(variantPath, options), MergeStrategy.Overwrite),
    restoreExistingGitIgnore(gitIgnoreState),
  ])
}
