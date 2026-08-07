import type { Locator }      from '@yarnpkg/core'
import type { Project }      from '@yarnpkg/core'
import type { Filename }     from '@yarnpkg/fslib'
import type { PortablePath } from '@yarnpkg/fslib'

export interface NextExecutableOptions {
  baseEnvironment: NodeJS.ProcessEnv
  binFolder: PortablePath
  locator: Locator
  output?: 'standalone'
  project: Project
  rendererCwd: PortablePath
}

export interface NextExecutable {
  env: NodeJS.ProcessEnv
  executable: Filename
}
