import type { Locator }                    from '@yarnpkg/core'
import type { Project }                    from '@yarnpkg/core'

import type { YarnNodeEnvironmentOptions } from './executor.interfaces.js'
import type { PnpRuntimeApi }              from './pnp-api.interfaces.js'

import { Filename }                        from '@yarnpkg/fslib'
import { scriptUtils }                     from '@yarnpkg/core'
import { structUtils }                     from '@yarnpkg/core'
import { npath }                           from '@yarnpkg/fslib'
import { ppath }                           from '@yarnpkg/fslib'

import { createYarnBaseEnvironment }       from '../../../yarn/launcher.js'
import { installPackageBinaries }          from './package-binaries.js'
import { loadProjectPnpApi }               from './pnp-api.js'

const MANAGED_NODE_LOADER_ENV = 'RAIJIN_NODE_LOADER'
const OWNED_ENVIRONMENT_NAMES = new Set(
  [
    'BERRY_BIN_FOLDER',
    'INIT_CWD',
    'PROJECT_CWD',
    'RAIJIN_NODE_LOADER',
    'RAIJIN_REGISTERED_PNP_LOADER',
    'YARN_IGNORE_PATH',
    'npm_config_user_agent',
    'npm_execpath',
  ].map((name) => name.toUpperCase())
)

const applyEnvironmentPatch = (
  environment: NodeJS.ProcessEnv,
  patch: YarnNodeEnvironmentOptions['environmentPatch']
): void => {
  for (const [name, value] of Object.entries(patch)) {
    if (OWNED_ENVIRONMENT_NAMES.has(name.toUpperCase())) {
      throw new Error(`Managed Node execution cannot override ${name}`)
    }

    if (value === undefined) {
      Reflect.deleteProperty(environment, name)
    } else {
      environment[name] = value
    }
  }
}

const applyPackageEnvironment = (
  environment: NodeJS.ProcessEnv,
  locator: Locator,
  project: Project,
  pnpApi: PnpRuntimeApi
): void => {
  const pkg = project.storedPackages.get(locator.locatorHash)

  if (!pkg) {
    throw new Error(
      `Package ${structUtils.stringifyLocator(locator)} is missing from project state`
    )
  }

  const workspace = project.tryWorkspaceByLocator(locator)
  let packageLocation = workspace?.cwd

  if (!packageLocation) {
    const packageInformation = pnpApi.getPackageInformation({
      name: structUtils.stringifyIdent(pkg),
      reference: pkg.reference,
    })

    if (!packageInformation) {
      throw new Error(
        `Package ${structUtils.stringifyLocator(locator)} is missing from the PnP map`
      )
    }

    packageLocation = npath.toPortablePath(packageInformation.packageLocation)
  }

  environment.npm_package_json = npath.fromPortablePath(
    ppath.join(packageLocation, Filename.manifest)
  )
  environment.npm_package_name = structUtils.stringifyIdent(locator)
  environment.npm_package_version = workspace?.manifest.version ?? pkg.version ?? ''
}

export const createYarnNodeEnvironment = async ({
  baseEnvironment,
  binFolder,
  cwd,
  environmentPatch,
  locator,
  project,
}: YarnNodeEnvironmentOptions): Promise<NodeJS.ProcessEnv> => {
  const baseEnv = createYarnBaseEnvironment({
    ...project.configuration.env,
    ...baseEnvironment,
  })
  const managedNodeLoaderName = Object.keys(baseEnv).find(
    (name) => name.toUpperCase() === MANAGED_NODE_LOADER_ENV
  )

  if (managedNodeLoaderName) {
    Reflect.deleteProperty(baseEnv, managedNodeLoaderName)
  }

  applyEnvironmentPatch(baseEnv, environmentPatch)

  let pnpApi: PnpRuntimeApi | undefined

  if (locator) {
    await project.restoreInstallState()
    pnpApi = loadProjectPnpApi(project)
  }

  const environment = await scriptUtils.makeScriptEnv({
    baseEnv,
    binFolder,
    project,
    ignoreCorepack: true,
  })

  if (locator && pnpApi) {
    applyPackageEnvironment(environment, locator, project, pnpApi)
    await installPackageBinaries({ binFolder, locator, pnpApi, project })
  }

  environment.INIT_CWD = cwd
  environment.PROJECT_CWD = npath.fromPortablePath(project.cwd)

  return environment
}
