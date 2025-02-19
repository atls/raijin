// import type { Plugin }            from '@yarnpkg/core'
// import type { Workspace }         from '@yarnpkg/core'
//
// import { GenerateProjectCommand } from './generate-project.command.jsx'
// import { MigrationUpCommand }     from './migration-up.command.jsx'
//
// const beforeWorkspacePacking = (workspace: Workspace, rawManifest: any) => {
//   if (rawManifest.publishConfig?.schematics) {
//     // eslint-disable-next-line no-param-reassign
//     rawManifest.schematics = rawManifest.publishConfig.schematics
//   }
// }
//
// export const plugin: Plugin = {
//   commands: [GenerateProjectCommand, MigrationUpCommand],
//   hooks: [beforeWorkspacePacking],
// }
