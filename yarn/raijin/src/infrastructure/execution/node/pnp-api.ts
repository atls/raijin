import type { Project }       from '@yarnpkg/core'

import type { PnpRuntimeApi } from './pnp-api.interfaces.js'

import { Filename }           from '@yarnpkg/fslib'
import { miscUtils }          from '@yarnpkg/core'
import { ppath }              from '@yarnpkg/fslib'

export const loadProjectPnpApi = (project: Project): PnpRuntimeApi =>
  miscUtils.dynamicRequire(ppath.join(project.cwd, Filename.pnpCjs)) as PnpRuntimeApi
