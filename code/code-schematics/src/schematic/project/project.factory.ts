import type { Rule }                     from '@angular-devkit/schematics'
import type { SchematicContext }         from '@angular-devkit/schematics'
import type { Tree }                     from '@angular-devkit/schematics'

import { MergeStrategy }                 from '@angular-devkit/schematics'
import { chain }                         from '@angular-devkit/schematics'
import { mergeWith }                     from '@angular-devkit/schematics'

import { updateTsConfigRule }            from '../rules/index.js'
import { generateCommonSource }          from '../sources/index.js'
import { generateProjectSpecificSource } from '../sources/index.js'
import { mergeGitIgnoreContent }         from '../utils/index.js'

const GITIGNORE_PATH = '.gitignore'

const captureGitIgnoreContentRule = (state: { content?: string }): Rule =>
  (host: Tree): Tree => {
    const gitIgnoreBuffer = host.read(GITIGNORE_PATH)

    if (!gitIgnoreBuffer) {
      return host
    }

    state.content = gitIgnoreBuffer.toString('utf-8')

    return host
  }

const mergeGitIgnoreContentRule = (state: { content?: string }): Rule =>
  (host: Tree, context: SchematicContext): Tree => {
    if (state.content === undefined) {
      return host
    }

    const gitIgnoreBuffer = host.read(GITIGNORE_PATH)

    if (!gitIgnoreBuffer) {
      return host
    }

    const templateContent = gitIgnoreBuffer.toString('utf-8')
    const mergedContent = mergeGitIgnoreContent({
      existingContent: state.content,
      templateContent,
    })

    if (mergedContent !== templateContent) {
      context.logger.info('Merging template .gitignore with project-specific entries')
      host.overwrite(GITIGNORE_PATH, mergedContent)
    }

    return host
  }

export const main = (options: Record<string, string>): Rule => {
  const state: { content?: string } = {}

  return chain([
    captureGitIgnoreContentRule(state),
    updateTsConfigRule,
    mergeWith(generateCommonSource(options), MergeStrategy.Overwrite),
    mergeWith(generateProjectSpecificSource(options), MergeStrategy.Overwrite),
    mergeGitIgnoreContentRule(state),
  ])
}
