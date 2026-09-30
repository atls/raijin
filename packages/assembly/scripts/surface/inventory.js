import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * @typedef {{
 *   command: string,
 *   description: string,
 *   details?: string,
 *   examples: Array<{ command: string }>,
 *   options: Array<unknown>,
 *   pathTokens: Array<string>,
 *   plugin: string,
 *   usage: string,
 * }} RuntimeCommand
 * @typedef {{
 *   commands: Array<RuntimeCommand>,
 *   plugins: Array<string>,
 *   schemaVersion: number,
 * }} RuntimeCliSurface
 */

/** @param {NodeJS.ProcessEnv} environment */
const createRuntimeEnvironment = (environment = process.env) => {
  /** @type {NodeJS.ProcessEnv} */
  const env = {
    ...environment,
    FORCE_COLOR: '0',
    YARN_IGNORE_PATH: '1',
  }

  delete env.NODE_OPTIONS
  delete env.NODE_PATH

  return env
}

/**
 * @param {{
 *   args: Array<string>,
 *   cwd: string,
 *   environment?: NodeJS.ProcessEnv,
 *   runtimePath: string,
 * }} input
 */
export const executeRuntime = async ({ args, cwd, environment, runtimePath }) => {
  const { stdout } = await execFileAsync(process.execPath, [runtimePath, ...args], {
    cwd,
    encoding: 'utf8',
    env: createRuntimeEnvironment(environment),
  })

  return stdout
}

/**
 * @param {{ cwd: string, runtimePath: string }} input
 * @returns {Promise<RuntimeCliSurface>}
 */
export const loadRuntimeCliSurface = async ({ cwd, runtimePath }) => {
  const environment = {
    RAIJIN_CLI_INVENTORY: '1',
  }
  const output = await executeRuntime({
    args: [],
    cwd,
    environment: { ...process.env, ...environment },
    runtimePath,
  })
  /** @type {RuntimeCliSurface} */
  const inventory = JSON.parse(output)

  if (inventory.schemaVersion !== 1) {
    throw new Error(`Unsupported CLI surface schema: ${inventory.schemaVersion ?? 'missing'}`)
  }

  if (!Array.isArray(inventory.commands) || !Array.isArray(inventory.plugins)) {
    throw new Error('Runtime CLI surface is missing commands or plugins')
  }

  return inventory
}
