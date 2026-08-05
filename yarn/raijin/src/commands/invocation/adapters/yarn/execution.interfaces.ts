import type { Locator }                    from '@yarnpkg/core'
import type { Project }                    from '@yarnpkg/core'
import type { PortablePath }               from '@yarnpkg/fslib'

import type { YarnCommandRunOptions }      from '../../resolve.interfaces.js'
import type { CommandEnvironmentPatch }    from '../../resolve.interfaces.js'
import type { InvocationExecutionContext } from '../child-process.interfaces.js'

export interface YarnExecutableOptions {
  baseEnvironment?: NodeJS.ProcessEnv
  binFolder: PortablePath
  environmentPatch?: CommandEnvironmentPatch
  project: Project
  locator?: Locator
  nodeLoader?: string
  nodeOptions?: string | null
}

export interface YarnExecutable {
  env: NodeJS.ProcessEnv
  executable: string
}

export interface YarnCommandOptions {
  args: Array<string>
  context: InvocationExecutionContext
  executionCwd: PortablePath
  options?: YarnCommandRunOptions
  project: Project
}
