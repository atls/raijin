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

const OWNED_ENVIRONMENT_NAMES = [
  'BERRY_BIN_FOLDER',
  'INIT_CWD',
  'PROJECT_CWD',
  'RAIJIN_NODE_LOADER',
  'RAIJIN_REGISTERED_PNP_LOADER',
  'YARN_IGNORE_PATH',
  'npm_config_user_agent',
  'npm_execpath',
]
const OWNED_ENVIRONMENT_NAME_SET = new Set(
  OWNED_ENVIRONMENT_NAMES.map((name) => name.toUpperCase())
)

const deleteEnvironmentVariable = (
  environment: NodeJS.ProcessEnv,
  name: string,
  platform: NodeJS.Platform = process.platform
): void => {
  const names =
    platform === 'win32'
      ? Object.keys(environment).filter(
          (environmentName) => environmentName.toUpperCase() === name.toUpperCase()
        )
      : [name]

  for (const environmentName of names) {
    Reflect.deleteProperty(environment, environmentName)
  }
}

const setEnvironmentVariable = (
  environment: NodeJS.ProcessEnv,
  name: string,
  value: string,
  platform: NodeJS.Platform = process.platform
): void => {
  if (platform === 'win32') {
    deleteEnvironmentVariable(environment, name, platform)
  }

  environment[name] = value
}

export const applyEnvironmentPatch = (
  environment: NodeJS.ProcessEnv,
  patch: YarnNodeEnvironmentOptions['environmentPatch'],
  platform: NodeJS.Platform = process.platform
): void => {
  for (const [name, value] of Object.entries(patch)) {
    if (OWNED_ENVIRONMENT_NAME_SET.has(name.toUpperCase())) {
      throw new Error(`Managed Node execution cannot override ${name}`)
    }

    if (value === undefined) {
      deleteEnvironmentVariable(environment, name, platform)
    } else {
      setEnvironmentVariable(environment, name, value, platform)
    }
  }
}

const applyPackageEnvironment = (
  environment: NodeJS.ProcessEnv,
  locator: Locator,
  project: Project,
  pnpApi: PnpRuntimeApi,
  platform: NodeJS.Platform = process.platform
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

  setEnvironmentVariable(
    environment,
    'npm_package_json',
    npath.fromPortablePath(ppath.join(packageLocation, Filename.manifest)),
    platform
  )
  setEnvironmentVariable(
    environment,
    'npm_package_name',
    structUtils.stringifyIdent(locator),
    platform
  )
  setEnvironmentVariable(
    environment,
    'npm_package_version',
    workspace?.manifest.version ?? pkg.version ?? '',
    platform
  )
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

  for (const name of OWNED_ENVIRONMENT_NAMES) {
    deleteEnvironmentVariable(baseEnv, name)
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

  setEnvironmentVariable(environment, 'INIT_CWD', cwd)
  setEnvironmentVariable(environment, 'PROJECT_CWD', npath.fromPortablePath(project.cwd))

  return environment
}
