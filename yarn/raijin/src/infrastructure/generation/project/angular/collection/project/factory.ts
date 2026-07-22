import type { Rule }                      from '@angular-devkit/schematics'
import type { Source }                    from '@angular-devkit/schematics'
import type { Tree }                      from '@angular-devkit/schematics'

import type { CapturedState }             from '../../rules/gitignore/rule.interfaces.js'
import type { PackageManifest }           from './factory.interfaces.js'
import type { SchematicOptions }          from './factory.interfaces.js'

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

import { captureGitIgnore }               from '../../rules/gitignore/rule.js'
import { mergeCapturedGitIgnore }         from '../../rules/gitignore/rule.js'
import { readProjectJson }                from '../../rules/json/rule.js'
import { updateProjectJson }              from '../../rules/json/rule.js'

const PACKAGE_JSON_PATH = 'package.json'
const TSCONFIG_PATH = 'tsconfig.json'

const templateDirectories: Record<SchematicOptions['type'], string> = {
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

const mergeCommonTemplates = (options: SchematicOptions): Rule =>
  mergeWith(createTemplateSource('common', options), MergeStrategy.Overwrite)

const mergeScaffoldTemplates = (options: SchematicOptions): Rule =>
  (tree: Tree): Rule => {
    const manifest = readProjectJson<PackageManifest>(tree, PACKAGE_JSON_PATH)
    const templateDirectory = templateDirectories[options.type]

    return mergeWith(
      createTemplateSource(templateDirectory, {
        ...options,
        projectName: manifest.name,
      }),
      MergeStrategy.Overwrite
    )
  }

export const scaffold = (options: SchematicOptions): Rule => {
  const gitIgnoreState: CapturedState = {}

  return chain([
    captureGitIgnore(gitIgnoreState),
    updateTypeScriptConfiguration(),
    mergeCommonTemplates(options),
    mergeScaffoldTemplates(options),
    mergeCapturedGitIgnore(gitIgnoreState),
  ])
}
