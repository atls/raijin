import type { WorkspaceConfigurationOptions } from './configuration.interfaces.js'

import { readFile }                           from 'node:fs/promises'
import { join }                               from 'node:path'

export class WorkspaceConfiguration {
  static async find(cwd: string): Promise<WorkspaceConfigurationOptions> {
    try {
      const { tools = {} } = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8'))

      return tools as WorkspaceConfigurationOptions
    } catch {
      return {}
    }
  }
}
