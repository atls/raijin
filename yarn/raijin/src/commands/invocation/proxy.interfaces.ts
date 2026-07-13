import type { PluginConfiguration } from '@yarnpkg/core'
import type { PortablePath }        from '@yarnpkg/fslib'
import type { Readable }            from 'node:stream'
import type { Writable }            from 'node:stream'

export interface ProxyOptions {
  args: Array<string>
  cwd: PortablePath
  plugins: PluginConfiguration
  stderr: Writable
  stdin: Readable
  stdout: Writable
  env?: NodeJS.ProcessEnv
}
