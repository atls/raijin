import type { ProjectScaffoldType } from '@atls/raijin/application/generation'

export interface ProjectSchematicOptions {
  readonly type: ProjectScaffoldType
}

export interface ProjectScaffoldPackageManifest {
  readonly name?: string
}

export interface ProjectGitIgnoreState {
  content?: string
}
