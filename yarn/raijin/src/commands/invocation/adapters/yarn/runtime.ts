import type { Project }                    from '@yarnpkg/core'

import type { InvocationExecutionContext } from '../child-process.interfaces.js'

import { pathToFileURL }                   from 'node:url'

import { Filename }                        from '@yarnpkg/fslib'
import { npath }                           from '@yarnpkg/fslib'
import { ppath }                           from '@yarnpkg/fslib'
import { xfs }                             from '@yarnpkg/fslib'

import { MANAGED_NODE_LOADER_ENV }         from '@atls/raijin/runtime/node/bootstrap'
import { REGISTERED_PNP_LOADER_ENV }       from '@atls/raijin/runtime/node/bootstrap'
import { registerNodeLoaders }             from '@atls/raijin/runtime/node/bootstrap'

import { executeChildProcess }             from '../child-process.js'
import { createYarnExecutable }            from './execution.js'

const PROJECT_RUNTIME_ENV = 'RAIJIN_PROJECT_RUNTIME'

const isProjectRuntimeReady = (project: Project, environment: NodeJS.ProcessEnv): boolean => {
  const pnpCjsPath = npath.fromPortablePath(ppath.join(project.cwd, Filename.pnpCjs))

  return (
    environment[PROJECT_RUNTIME_ENV] === npath.fromPortablePath(project.cwd) &&
    (environment.NODE_OPTIONS?.includes(pnpCjsPath) ?? false)
  )
}

export const ensureProjectRuntime = async (
  project: Project,
  context: InvocationExecutionContext
): Promise<number | undefined> => {
  if (isProjectRuntimeReady(project, context.environment)) {
    return undefined
  }

  const runtimePath = process.argv[1]

  if (!runtimePath) {
    throw new Error('Yarn runtime path is missing')
  }

  const { env } = await createYarnExecutable({
    baseEnvironment: context.environment,
    binFolder: await xfs.mktempPromise(),
    project,
  })
  const pnpEsmLoaderPath = ppath.join(project.cwd, Filename.pnpEsmLoader)

  env[PROJECT_RUNTIME_ENV] = npath.fromPortablePath(project.cwd)

  if (await xfs.existsPromise(pnpEsmLoaderPath)) {
    env[REGISTERED_PNP_LOADER_ENV] = pathToFileURL(npath.fromPortablePath(pnpEsmLoaderPath)).href
  }

  const result = await executeChildProcess(
    process.execPath,
    [runtimePath, ...process.argv.slice(2)],
    {
      context,
      cwd: npath.fromPortablePath(ppath.cwd()),
      env,
    }
  )

  return result.exitCode
}

const activatePnpRuntime = async (project: Project): Promise<void> => {
  const pnpEsmLoaderPath = ppath.join(project.cwd, Filename.pnpEsmLoader)

  if (!(await xfs.existsPromise(pnpEsmLoaderPath))) {
    return
  }

  const pnpLoader = pathToFileURL(npath.fromPortablePath(pnpEsmLoaderPath)).href

  if (process.env[REGISTERED_PNP_LOADER_ENV] === pnpLoader) {
    return
  }

  const inheritedTypeScriptLoader = process.env[MANAGED_NODE_LOADER_ENV]
  const loaders = [pnpLoader, inheritedTypeScriptLoader].filter((loader): loader is string =>
    Boolean(loader))

  await registerNodeLoaders(loaders)
  process.env[REGISTERED_PNP_LOADER_ENV] = pnpLoader
}

const applyChildProcessNodeOptions = async (project: Project): Promise<void> => {
  const { env } = await createYarnExecutable({
    binFolder: await xfs.mktempPromise(),
    project,
  })

  if (env.NODE_OPTIONS) {
    process.env.NODE_OPTIONS = env.NODE_OPTIONS
  } else {
    Reflect.deleteProperty(process.env, 'NODE_OPTIONS')
  }
}

export const activateProjectRuntime = async (project: Project): Promise<void> => {
  await activatePnpRuntime(project)
  await applyChildProcessNodeOptions(project)
}
