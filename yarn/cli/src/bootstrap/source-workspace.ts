import type { PluginConfiguration }      from '@yarnpkg/core'
import type { PortablePath }             from '@yarnpkg/fslib'

import { pathToFileURL }                 from 'node:url'

import { Configuration }                 from '@yarnpkg/core'
import { Project }                       from '@yarnpkg/core'
import { structUtils }                   from '@yarnpkg/core'
import { npath }                         from '@yarnpkg/fslib'
import { ppath }                         from '@yarnpkg/fslib'
import { getPnpPath }                    from '@yarnpkg/plugin-pnp'

import { MANAGED_NODE_LOADER_ENV }       from '@atls/raijin/runtime/node/bootstrap'
import { resolveSourceTypeScriptLoader } from '@atls/raijin/runtime-exec-argv'
import { registerNodeLoaders }           from '@atls/raijin/runtime/node/bootstrap'

const RAIJIN_PACKAGE_IDENT = structUtils.parseIdent('@atls/raijin')
const PACKAGE_MANIFEST = 'package.json'

export const registerRaijinSourceWorkspaceRuntime = async (
  cwd: PortablePath,
  pluginConfiguration: PluginConfiguration
): Promise<void> => {
  const configuration = await Configuration.find(cwd, pluginConfiguration, {
    strict: false,
  })

  if (!configuration.projectCwd) {
    return
  }

  const { project } = await Project.find(configuration, cwd)
  const workspace = project.tryWorkspaceByIdent(RAIJIN_PACKAGE_IDENT)

  if (!workspace) {
    return
  }

  const packagePath = npath.fromPortablePath(ppath.join(workspace.cwd, PACKAGE_MANIFEST))
  const pnpLoaderPath = npath.fromPortablePath(getPnpPath(project).esmLoader)
  const typeScriptLoader = await resolveSourceTypeScriptLoader(packagePath)

  await registerNodeLoaders([pathToFileURL(pnpLoaderPath).href, typeScriptLoader])

  process.env[MANAGED_NODE_LOADER_ENV] = typeScriptLoader
}
