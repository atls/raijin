import type { YarnCommandRunner }          from './runner.js'
import type { YarnCommandReader }          from './runner.js'
import type { YarnCommandOptions }         from './runner.js'
import type { YarnPackageMetadata }        from './runner.js'
import type { YarnPackageQuery }           from './runner.js'

import { RaijinYarnCommandException }      from './exceptions/command.js'
import { assertProcessCompleted } from '../commands/invocation/capabilities/assert-process-completed.js'
import { set as setEnvironmentVariable }   from '../execution/environment/map.js'
import { create as createProcessExecutor } from '../execution/process/executor.js'
import { createLauncherBaseEnvironment }   from './launcher.js'

export const createYarnCommandEnvironment = (
  cwd: string,
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  const yarnEnvironment = createLauncherBaseEnvironment(environment)

  setEnvironmentVariable(yarnEnvironment, 'INIT_CWD', cwd)
  setEnvironmentVariable(yarnEnvironment, 'PROJECT_CWD', cwd)

  return yarnEnvironment
}

const createYarnInvocation = (
  args: Array<string>,
  cwd: string,
  options: YarnCommandOptions
): { command: string; args: Array<string>; environment: NodeJS.ProcessEnv } => {
  const environment = createYarnCommandEnvironment(cwd)

  if (options.packageManager && !options.followYarnPath) {
    environment.YARN_IGNORE_PATH = '1'
  }

  if (options.skipInstallHooks) {
    environment.IMAGE_PACK = '1'
  }

  return options.packageManager
    ? { command: 'corepack', args: [options.packageManager, ...args], environment }
    : { command: 'yarn', args, environment }
}

export const runYarnCommand: YarnCommandRunner = async (
  args: Array<string>,
  cwd: string,
  options = {}
): Promise<void> => {
  const invocation = createYarnInvocation(args, cwd, options)
  const executor = createProcessExecutor({
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
  })
  const result = await executor.execute(invocation.command, invocation.args, {
    cwd,
    environment: invocation.environment,
  })

  assertProcessCompleted(result)

  if (result.exitCode !== 0) {
    throw new RaijinYarnCommandException(args)
  }
}

export const readYarnCommand: YarnCommandReader = async (args, cwd, options = {}) => {
  const invocation = createYarnInvocation(args, cwd, options)
  const executor = createProcessExecutor({
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
  })
  const result = await executor.execute(invocation.command, invocation.args, {
    cwd,
    environment: invocation.environment,
    output: { mode: 'capture' },
  })

  assertProcessCompleted(result)

  if (result.exitCode !== 0) {
    throw new RaijinYarnCommandException(args)
  }

  return result.stdout
}

export const queryYarnPackage: YarnPackageQuery = async (name, version, cwd, packageManager) => {
  const args = [
    'npm',
    'info',
    `${name}@${version}`,
    '--json',
    '--fields',
    'name,version,gitHead,dist',
  ]
  const stdout = await readYarnCommand(args, cwd, { packageManager })

  const metadata: unknown = JSON.parse(stdout)

  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Yarn returned invalid package metadata')
  }

  const packageMetadata = metadata as Record<string, unknown>
  const { dist } = packageMetadata

  if (
    typeof packageMetadata.name !== 'string' ||
    typeof packageMetadata.version !== 'string' ||
    typeof packageMetadata.gitHead !== 'string' ||
    !dist ||
    typeof dist !== 'object' ||
    typeof (dist as Record<string, unknown>).integrity !== 'string'
  ) {
    throw new Error('Yarn returned invalid package metadata')
  }

  return {
    name: packageMetadata.name,
    version: packageMetadata.version,
    gitHead: packageMetadata.gitHead,
    dist: { integrity: (dist as Record<string, string>).integrity },
  } satisfies YarnPackageMetadata
}
