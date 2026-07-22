import type { Rule }                      from '@angular-devkit/schematics'
import type { SchematicContext }          from '@angular-devkit/schematics'
import type { Source }                    from '@angular-devkit/schematics'
import type { Tree }                      from '@angular-devkit/schematics'
import type { ProjectScaffoldType }       from '@atls/raijin/application/generation'

import { MergeStrategy }                  from '@angular-devkit/schematics'
import { strings }                        from '@angular-devkit/core'
import { apply }                          from '@angular-devkit/schematics'
import { chain }                          from '@angular-devkit/schematics'
import { mergeWith }                      from '@angular-devkit/schematics'
import { move }                           from '@angular-devkit/schematics'
import { template }                       from '@angular-devkit/schematics'
import { url }                            from '@angular-devkit/schematics'

import { applyTypeScriptCompilerOptions } from '@atls/raijin/config/typescript'
import { typescriptDefaults }             from '@atls/raijin/config/typescript'

import { mergeProjectGitIgnore }          from '../../rules/gitignore.js'
import { readProjectJson }                from '../../rules/json.js'
import { updateProjectJson }              from '../../rules/json.js'

const GITIGNORE_PATH = '.gitignore'
const PACKAGE_JSON_PATH = 'package.json'
const TSCONFIG_PATH = 'tsconfig.json'

interface ProjectSchematicOptions {
  readonly type: ProjectScaffoldType
}

interface ProjectScaffoldPackageManifest {
  readonly name: string
}

interface ProjectGitIgnoreState {
  content?: string
}

const templateDirectories: Record<ProjectSchematicOptions['type'], string> = {
  library: 'libraries',
  project: 'project',
}

const createTemplateSource = (templateDirectory: string, variables: object): Source =>
  apply(url(`../templates/${templateDirectory}`), [
    template({
      ...strings,
      ...variables,
      dot: '.',
    }),
    move('./'),
  ])

const updateTypeScriptConfiguration = (): Rule =>
  updateProjectJson(TSCONFIG_PATH, (configuration) =>
    applyTypeScriptCompilerOptions(configuration, typescriptDefaults.compilerOptions))

const mergeCommonTemplates = (options: ProjectSchematicOptions): Rule =>
  mergeWith(createTemplateSource('common', options), MergeStrategy.Overwrite)

const mergeScaffoldTemplates = (options: ProjectSchematicOptions): Rule =>
  (tree: Tree): Rule => {
    const manifest = readProjectJson<ProjectScaffoldPackageManifest>(tree, PACKAGE_JSON_PATH)
    const templateDirectory = templateDirectories[options.type]

    return mergeWith(
      createTemplateSource(templateDirectory, {
        ...options,
        projectName: manifest.name,
      }),
      MergeStrategy.Overwrite
    )
  }

const captureProjectGitIgnore = (state: ProjectGitIgnoreState): Rule =>
  (tree: Tree): Tree => {
    const content = tree.read(GITIGNORE_PATH)

    if (content) {
      state.content = content.toString('utf-8')
    }

    return tree
  }

const mergeCapturedProjectGitIgnore = (state: ProjectGitIgnoreState): Rule =>
  (tree: Tree, context: SchematicContext): Tree => {
    const templateFile = tree.read(GITIGNORE_PATH)

    if (state.content === undefined || !templateFile) {
      return tree
    }

    const templateContent = templateFile.toString('utf-8')
    const mergedContent = mergeProjectGitIgnore({
      existingContent: state.content,
      templateContent,
    })

    if (mergedContent !== templateContent) {
      context.logger.info('Preserving project-specific .gitignore entries')
      tree.overwrite(GITIGNORE_PATH, mergedContent)
    }

    return tree
  }

export const generateProjectScaffold = (options: ProjectSchematicOptions): Rule => {
  const gitIgnoreState: ProjectGitIgnoreState = {}

  return chain([
    captureProjectGitIgnore(gitIgnoreState),
    updateTypeScriptConfiguration(),
    mergeCommonTemplates(options),
    mergeScaffoldTemplates(options),
    mergeCapturedProjectGitIgnore(gitIgnoreState),
  ])
}
