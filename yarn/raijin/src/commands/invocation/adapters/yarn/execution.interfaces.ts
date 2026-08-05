import type { Locator }                    from '@yarnpkg/core'
import type { Project }                    from '@yarnpkg/core'
import type { PortablePath }               from '@yarnpkg/fslib'

import type { InvocationExecutionContext } from '../../execution/context.interfaces.js'
import type { ProcessEnvironmentPatch }    from '../../execution/process.interfaces.js'
import type { YarnCommandRunOptions }      from '../../execution/yarn.interfaces.js'

export interface YarnExecutableOptions {
  baseEnvironment?: NodeJS.ProcessEnv
  binFolder: PortablePath
  environmentPatch?: ProcessEnvironmentPatch
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
