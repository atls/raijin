import type { PluginConfiguration }  from '@yarnpkg/core'
import type { PortablePath }         from '@yarnpkg/fslib'
import type { PnpApi }               from '@yarnpkg/pnp'

import { pathToFileURL }             from 'node:url'

import { Configuration }             from '@yarnpkg/core'
import { Project }                   from '@yarnpkg/core'
import { miscUtils }                 from '@yarnpkg/core'
import { structUtils }               from '@yarnpkg/core'
import { npath }                     from '@yarnpkg/fslib'
import { ppath }                     from '@yarnpkg/fslib'
import { getPnpPath }                from '@yarnpkg/plugin-pnp'

import { MANAGED_NODE_LOADER_ENV }   from '@atls/raijin/runtime/node/bootstrap'
import { REGISTERED_PNP_LOADER_ENV } from '@atls/raijin/runtime/node/bootstrap'
import { registerNodeLoaders }       from '@atls/raijin/runtime/node/bootstrap'

const RAIJIN_PACKAGE_IDENT = structUtils.parseIdent('@atls/raijin')
const PACKAGE_MANIFEST = 'package.json'
const TYPESCRIPT_SPECIFIER = 'typescript'

const isModuleNotFoundError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'MODULE_NOT_FOUND'

const isTypeScriptRuntimeAvailable = (pnpApi: PnpApi, packagePath: string): boolean => {
  try {
    pnpApi.resolveRequest(TYPESCRIPT_SPECIFIER, packagePath)

    return true
  } catch (error) {
    if (isModuleNotFoundError(error)) {
      return false
    }

    throw error
  }
}

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
  const pnpPath = getPnpPath(project)
  const pnpApiPath = npath.fromPortablePath(pnpPath.cjs)
  const pnpLoaderPath = npath.fromPortablePath(pnpPath.esmLoader)
  const pnpLoader = pathToFileURL(pnpLoaderPath).href
  const inheritedTypeScriptLoader = process.env[MANAGED_NODE_LOADER_ENV]

  if (inheritedTypeScriptLoader && process.env[REGISTERED_PNP_LOADER_ENV] === pnpLoader) {
    return
  }

  const pnpApi = miscUtils.dynamicRequire(pnpApiPath) as PnpApi

  if (inheritedTypeScriptLoader) {
    await registerNodeLoaders([pnpLoader, inheritedTypeScriptLoader])
    process.env[REGISTERED_PNP_LOADER_ENV] = pnpLoader

    return
  }

  await registerNodeLoaders([pnpLoader])
  process.env[REGISTERED_PNP_LOADER_ENV] = pnpLoader

  if (!isTypeScriptRuntimeAvailable(pnpApi, packagePath)) {
    return
  }

  const { resolveSourceTypeScriptLoader } = await import('@atls/raijin/runtime-exec-argv')
  const typeScriptLoader = await resolveSourceTypeScriptLoader(packagePath)

  await registerNodeLoaders([typeScriptLoader])

  process.env[MANAGED_NODE_LOADER_ENV] = typeScriptLoader
}
