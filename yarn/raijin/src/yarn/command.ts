import type { YarnCommandRunner }     from './runner.js'

import { spawn }                      from 'node:child_process'
import { delimiter }                  from 'node:path'

import { RaijinYarnCommandException } from './exceptions/command.js'

const PATH_ENVIRONMENT_NAME = /^path$/i
const TEMPORARY_YARN_BIN_PATH = /[\\/]xfs-[^\\/]*(?:[\\/]|$)/
const PNP_NODE_OPTION = /(?:^|[\\/])\.pnp\.(?:cjs|loader\.mjs)$/
const NODE_OPTIONS_WITH_VALUE = new Set(['--experimental-loader', '--loader', '--require', '-r'])

const isPnPNodeOptionValue = (value: string): boolean => PNP_NODE_OPTION.test(value)

const splitNodeOptions = (nodeOptions: string): Array<string> => nodeOptions.match(/\S+/g) ?? []

const removePnPNodeOptions = (nodeOptions: string): string => {
  const options = splitNodeOptions(nodeOptions)
  const filtered: Array<string> = []

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index]
    const [name, value] = option.split('=', 2)

    if (value && NODE_OPTIONS_WITH_VALUE.has(name) && isPnPNodeOptionValue(value)) {
      continue
    }

    if (NODE_OPTIONS_WITH_VALUE.has(option)) {
      const next = options[index + 1]

      if (next && isPnPNodeOptionValue(next)) {
        index += 1
        continue
      }
    }

    filtered.push(option)
  }

  return filtered.join(' ')
}

const isTemporaryYarnBinPath = (value: string): boolean => TEMPORARY_YARN_BIN_PATH.test(value)

const sanitizePathEnvironment = (value: string): string =>
  value
    .split(delimiter)
    .filter((item) => item && !isTemporaryYarnBinPath(item))
    .join(delimiter)

const setPathEnvironment = (environment: NodeJS.ProcessEnv): void => {
  const pathName = Object.keys(environment).find((name) => PATH_ENVIRONMENT_NAME.test(name))

  if (!pathName) {
    return
  }

  const pathValue = environment[pathName]

  if (!pathValue) {
    return
  }

  const sanitizedPathValue = sanitizePathEnvironment(pathValue)

  if (sanitizedPathValue) {
    environment[pathName] = sanitizedPathValue
  } else {
    Reflect.deleteProperty(environment, pathName)
  }
}

export const createYarnCommandEnvironment = (
  cwd: string,
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  const yarnEnvironment = { ...environment }
  const nodeOptions = yarnEnvironment.NODE_OPTIONS

  delete yarnEnvironment.BERRY_BIN_FOLDER
  delete yarnEnvironment.npm_config_user_agent
  delete yarnEnvironment.npm_execpath
  delete yarnEnvironment.YARN_IGNORE_PATH

  if (nodeOptions) {
    const sanitizedNodeOptions = removePnPNodeOptions(nodeOptions)

    if (sanitizedNodeOptions) {
      yarnEnvironment.NODE_OPTIONS = sanitizedNodeOptions
    } else {
      delete yarnEnvironment.NODE_OPTIONS
    }
  }

  setPathEnvironment(yarnEnvironment)

  yarnEnvironment.INIT_CWD = cwd
  yarnEnvironment.PROJECT_CWD = cwd

  return yarnEnvironment
}

export const runYarnCommand: YarnCommandRunner = async (
  args: Array<string>,
  cwd: string
): Promise<void> => {
  const child = spawn('yarn', args, {
    cwd,
    env: createYarnCommandEnvironment(cwd),
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', resolve)
  })

  if (exitCode !== 0) {
    throw new RaijinYarnCommandException(args)
  }
}
