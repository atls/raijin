/* eslint-disable n/no-sync */

import type { PortablePath } from '@yarnpkg/fslib'
import type { Readable }     from 'node:stream'
import type { Writable }     from 'node:stream'

import { spawnSync }         from 'node:child_process'
import { readdirSync }       from 'node:fs'
import { delimiter }         from 'node:path'
import { join }              from 'node:path'
import { resolve }           from 'node:path'

import { execUtils }         from '@yarnpkg/core'

export const COMMAND_PROXY_EXECUTION = 'COMMAND_PROXY_EXECUTION'

export const NATIVE_NODE_REEXECUTION = 'ATLS_YARN_NATIVE_NODE_REEXECUTION'

export const ALLOW_ROSETTA_NODE = 'ATLS_YARN_ALLOW_ROSETTA_NODE'

export const NATIVE_NODE_PATH = 'ATLS_YARN_NATIVE_NODE'

const PNP_CJS_LOADER = '.pnp.cjs'

const PNP_ESM_LOADER = '.pnp.loader.mjs'

const NODE_ARCH_SCRIPT = 'process.stdout.write(process.arch)'

const ROSETTA_SYSCTL_KEY = 'sysctl.proc_translated'

const NODE_INSPECTION_TIMEOUT = 5000

export interface RuntimeState {
  platform: NodeJS.Platform

  arch: string

  translated: boolean
}

export interface YarnPnpProxyOptions {
  cwd: PortablePath

  stdin: Readable

  stdout: Writable

  stderr: Writable

  executeRegular: () => Promise<number>

  executeProxy: () => Promise<number>
}

export interface YarnPnpProxyPipeOptions {
  args: Array<string>

  cwd: PortablePath

  stdin: Readable

  stdout: Writable

  stderr: Writable

  env: NodeJS.ProcessEnv
}

export interface YarnPnpNativeNodeOptions {
  cwd: PortablePath

  stderr: Writable
}

export interface NativeNodeResolutionOptions {
  env?: NodeJS.ProcessEnv

  execPath?: string

  inspectNodeArchitecture?: (nodePath: string, env: NodeJS.ProcessEnv) => string | undefined
}

const getPathNodeCandidates = (path: string | undefined): Array<string> =>
  (path ?? '')
    .split(delimiter)
    .filter(Boolean)
    .map((pathPart) => join(pathPart, 'node'))

const getNvmNodeCandidates = (env: NodeJS.ProcessEnv): Array<string> => {
  const nvmDir = env.NVM_DIR ?? (env.HOME ? join(env.HOME, '.nvm') : undefined)

  if (!nvmDir) {
    return []
  }

  try {
    return readdirSync(join(nvmDir, 'versions', 'node'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(nvmDir, 'versions', 'node', entry.name, 'bin', 'node'))
      .sort()
      .reverse()
  } catch {
    return []
  }
}

const inspectNodeArchitecture = (
  nodePath: string,
  env: NodeJS.ProcessEnv = process.env
): string | undefined => {
  const result = spawnSync(nodePath, ['-e', NODE_ARCH_SCRIPT], {
    encoding: 'utf8',
    env: {
      ...env,
      NODE_OPTIONS: '',
    },
    timeout: NODE_INSPECTION_TIMEOUT,
  })

  if (result.status !== 0) {
    return undefined
  }

  return result.stdout.trim()
}

const createRosettaNodeFailureMessage = (): string =>
  [
    'Rosetta x64 Node detected on Apple Silicon.',
    'Yarn PnP ESM commands can hang under this runtime.',
    'Use native arm64 Node.js or set ATLS_YARN_NATIVE_NODE to its node binary.',
    `Set ${ALLOW_ROSETTA_NODE}=true to bypass this guard explicitly.`,
  ].join('\n')

export const hasPnpLoaders = (nodeOptions: string = ''): boolean =>
  nodeOptions.includes(PNP_CJS_LOADER) && nodeOptions.includes(PNP_ESM_LOADER)

export const isYarnPnpRegularRuntime = (env: NodeJS.ProcessEnv = process.env): boolean =>
  hasPnpLoaders(env.NODE_OPTIONS ?? '') || env[COMMAND_PROXY_EXECUTION] === 'true'

export const isRosettaRuntime = (runtime: RuntimeState): boolean =>
  runtime.platform === 'darwin' && runtime.arch === 'x64' && runtime.translated

export const detectRosettaTranslation = (): boolean => {
  if (process.platform !== 'darwin' || process.arch !== 'x64') {
    return false
  }

  const result = spawnSync('sysctl', ['-in', ROSETTA_SYSCTL_KEY], {
    encoding: 'utf8',
    timeout: NODE_INSPECTION_TIMEOUT,
  })

  return result.status === 0 && result.stdout.trim() === '1'
}

export const detectRuntimeState = (): RuntimeState => ({
  platform: process.platform,
  arch: process.arch,
  translated: detectRosettaTranslation(),
})

export const getNativeNodeCandidates = (
  env: NodeJS.ProcessEnv = process.env,
  execPath: string = process.execPath
): Array<string> => {
  const resolvedExecPath = resolve(execPath)

  const candidates: Array<string | undefined> = [
    env[NATIVE_NODE_PATH],
    env.NVM_BIN ? join(env.NVM_BIN, 'node') : undefined,
    ...getNvmNodeCandidates(env),
    env.VOLTA_HOME ? join(env.VOLTA_HOME, 'bin', 'node') : undefined,
    env.HOMEBREW_PREFIX ? join(env.HOMEBREW_PREFIX, 'bin', 'node') : undefined,
    ...getPathNodeCandidates(env.PATH),
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
  ]

  return Array.from(
    new Set(
      candidates
        .filter((candidate): candidate is string => Boolean(candidate))
        .map((candidate) => resolve(candidate))
        .filter((candidate) => candidate !== resolvedExecPath)
    )
  )
}

export const resolveNativeArm64NodePath = ({
  env = process.env,
  execPath = process.execPath,
  inspectNodeArchitecture: inspect = inspectNodeArchitecture,
}: NativeNodeResolutionOptions = {}): string | undefined =>
  getNativeNodeCandidates(env, execPath).find((candidate) => inspect(candidate, env) === 'arm64')

export const reexecuteYarnWithNativeNodeIfNeeded = ({
  cwd,
  stderr,
}: YarnPnpNativeNodeOptions): number | undefined => {
  if (process.env[ALLOW_ROSETTA_NODE] === 'true') {
    return undefined
  }

  if (!isRosettaRuntime(detectRuntimeState())) {
    return undefined
  }

  if (process.env[NATIVE_NODE_REEXECUTION] === 'true') {
    stderr.write(`${createRosettaNodeFailureMessage()}\n`)

    return 1
  }

  const nodePath = resolveNativeArm64NodePath()

  if (!nodePath) {
    stderr.write(`${createRosettaNodeFailureMessage()}\n`)

    return 1
  }

  stderr.write(`Rosetta x64 Node detected; re-running with native arm64 Node: ${nodePath}\n`)

  const result = spawnSync(nodePath, process.argv.slice(1), {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      [NATIVE_NODE_REEXECUTION]: 'true',
    },
  })

  if (result.error) {
    stderr.write(`${result.error.message}\n`)

    return 1
  }

  return result.status ?? 1
}

export const executeYarnPnpProxy = async ({
  cwd,
  stderr,
  executeRegular,
  executeProxy,
}: YarnPnpProxyOptions): Promise<number> => {
  const nativeNodeExitCode = reexecuteYarnWithNativeNodeIfNeeded({ cwd, stderr })

  if (typeof nativeNodeExitCode === 'number') {
    return nativeNodeExitCode
  }

  if (isYarnPnpRegularRuntime()) {
    return executeRegular()
  }

  return executeProxy()
}

export const pipeYarnPnpProxy = async ({
  args,
  cwd,
  stdin,
  stdout,
  stderr,
  env,
}: YarnPnpProxyPipeOptions): Promise<number> => {
  const yarnEntrypoint = process.argv[1]

  const { code } = yarnEntrypoint
    ? await execUtils.pipevp(process.execPath, [yarnEntrypoint, ...args], {
        cwd,
        stdin,
        stdout,
        stderr,
        env,
      })
    : await execUtils.pipevp('yarn', args, {
        cwd,
        stdin,
        stdout,
        stderr,
        env,
      })

  return code
}
