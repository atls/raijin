import type { CommandInput }           from '@atls/raijin/commands/input'
import type { ProjectWorkspaceSource } from '@atls/raijin/project'
import type { RaijinProjectModel }     from '@atls/raijin/project'
import type { PortablePath }           from '@yarnpkg/fslib'

import type { ScaffoldType }           from './scaffold.interfaces.js'

export interface Options {
  input: CommandInput
  project: RaijinProjectModel<ProjectWorkspaceSource<PortablePath>>
  type: ScaffoldType
}
