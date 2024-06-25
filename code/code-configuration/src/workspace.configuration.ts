import type { WorkspaceConfigurationOptions } from './configuration.interfaces.js'

import { join }                               from 'node:path'
import { readFile }                           from 'node:fs/promises'

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
