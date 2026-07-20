import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const createRuntimeEnvironment = (environment = process.env) => {
  const env = {
    ...environment,
    FORCE_COLOR: '0',
    YARN_IGNORE_PATH: '1',
  }

  delete env.NODE_OPTIONS
  delete env.NODE_PATH

  return env
}

export const executeRuntime = async ({ args, cwd, environment, runtimePath }) => {
  const { stdout } = await execFileAsync(process.execPath, [runtimePath, ...args], {
    cwd,
    encoding: 'utf8',
    env: createRuntimeEnvironment(environment),
  })

  return stdout
}

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
  const inventory = JSON.parse(output)

  if (inventory.schemaVersion !== 1) {
    throw new Error(`Unsupported CLI surface schema: ${inventory.schemaVersion ?? 'missing'}`)
  }

  if (!Array.isArray(inventory.commands) || !Array.isArray(inventory.plugins)) {
    throw new Error('Runtime CLI surface is missing commands or plugins')
  }

  return inventory
}
