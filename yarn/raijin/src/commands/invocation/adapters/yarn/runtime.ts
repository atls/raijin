import type { Project }                    from '@yarnpkg/core'
import type { PortablePath }               from '@yarnpkg/fslib'

import type { InvocationExecutionContext } from '../child-process.interfaces.js'

import { npath }                           from '@yarnpkg/fslib'
import { ppath }                           from '@yarnpkg/fslib'
import { xfs }                             from '@yarnpkg/fslib'

import { executeChildProcess }             from '../child-process.js'
import { createYarnExecutable }            from './execution.js'

const PROJECT_RUNTIME_ENV = 'RAIJIN_PROJECT_RUNTIME'

export interface ProjectRuntimeDependencies {
  argv?: Array<string>
  createExecutable?: typeof createYarnExecutable
  cwd?: PortablePath
  execPath?: string
  execute?: typeof executeChildProcess
}

export const validateProjectRuntime = (project: Project): void => {
  const nodeLinker = project.configuration.get('nodeLinker')

  if (nodeLinker !== 'pnp') {
    throw new Error(`Raijin commands require Yarn Plug'n'Play; received nodeLinker=${nodeLinker}`)
  }
}

export const ensureProjectRuntime = async (
  project: Project,
  context: InvocationExecutionContext,
  dependencies: ProjectRuntimeDependencies = {}
): Promise<number | undefined> => {
  validateProjectRuntime(project)

  const projectCwd = npath.fromPortablePath(project.cwd)

  if (context.environment[PROJECT_RUNTIME_ENV] === projectCwd) {
    return undefined
  }

  const argv = dependencies.argv ?? process.argv
  const runtimePath = argv[1]

  if (!runtimePath) {
    throw new Error('Yarn runtime path is missing')
  }

  const createExecutable = dependencies.createExecutable ?? createYarnExecutable
  const { env } = await createExecutable({
    baseEnvironment: context.environment,
    binFolder: await xfs.mktempPromise(),
    project,
  })
  const execute = dependencies.execute ?? executeChildProcess

  env[PROJECT_RUNTIME_ENV] = projectCwd

  const result = await execute(
    dependencies.execPath ?? process.execPath,
    [runtimePath, ...argv.slice(2)],
    {
      context,
      cwd: npath.fromPortablePath(dependencies.cwd ?? ppath.cwd()),
      env,
    }
  )

  return result.exitCode
}
