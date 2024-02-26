import { Plugin }                 from '@yarnpkg/core'
import { Workspace }              from '@yarnpkg/core'

import { GenerateProjectCommand } from './generate-project.command.js'
import { MigrationUpCommand }     from './migration-up.command.js'

const beforeWorkspacePacking = (workspace: Workspace, rawManifest: any) => {
  if (rawManifest.publishConfig && rawManifest.publishConfig.schematics) {
    // eslint-disable-next-line no-param-reassign
    rawManifest.schematics = rawManifest.publishConfig.schematics
  }
}

export const plugin: Plugin = {
  commands: [GenerateProjectCommand, MigrationUpCommand],
  hooks: [beforeWorkspacePacking],
}
