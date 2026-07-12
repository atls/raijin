import type { Locator }           from '@yarnpkg/core'
import type { Project }           from '@yarnpkg/core'
import type { PortablePath }      from '@yarnpkg/fslib'
import type { Readable }          from 'node:stream'
import type { Writable }          from 'node:stream'

import type { ProjectInvocation } from '../../resolve.interfaces.js'

export interface YarnExecutableOptions {
  binFolder: PortablePath
  project: Project
  locator?: Locator
  env?: NodeJS.ProcessEnv
  nodeLoader?: string
}

export interface YarnExecutable {
  env: NodeJS.ProcessEnv
  executable: string
}

export interface YarnCommandOptions {
  args: Array<string>
  invocation: ProjectInvocation
  stderr: Writable
  stdin: Readable
  stdout: Writable
  env?: NodeJS.ProcessEnv
}
