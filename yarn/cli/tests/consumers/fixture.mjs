import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

export const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url))
export const runtimePath = join(repoRoot, '.yarn/releases/yarn.mjs')
const execFileAsync = promisify(execFile)
const gitEnvironmentNames = (await execFileAsync('git', ['rev-parse', '--local-env-vars'])).stdout
  .trim()
  .split('\n')

export const fixtureEnvironment = () => {
  const environment = { ...process.env }
  const binFolder = environment.BERRY_BIN_FOLDER

  if (binFolder && environment.PATH) {
    environment.PATH = environment.PATH.split(delimiter)
      .filter((path) => path !== binFolder)
      .join(delimiter)
  }

  for (const name of [
    'NODE_OPTIONS',
    'NODE_TEST_CONTEXT',
    'NODE_PATH',
    'RAIJIN_CLI_INVENTORY',
    'RAIJIN_NODE_LOADER',
    'RAIJIN_NODE_LOADER_REGISTRATION',
    'RAIJIN_REGISTERED_PNP_LOADER',
    'YARN_IGNORE_PATH',
    'BERRY_BIN_FOLDER',
    'INIT_CWD',
    'PROJECT_CWD',
    'npm_execpath',
    'npm_node_execpath',
    ...gitEnvironmentNames,
  ]) {
    Reflect.deleteProperty(environment, name)
  }

  return environment
}

/** @param {string} command @param {string[]} args @param {string} cwd @param {NodeJS.ProcessEnv} environment */
export const execute = async (command, args, cwd, environment) => {
  const { stdout } = await execFileAsync(command, args, { cwd, env: environment, encoding: 'utf8' })

  return stdout
}

/**
 * @param {import('node:test').TestContext} t
 * @param {string} archivePath
 * @param {Record<string, string>} dependencies
 * @param {NodeJS.ProcessEnv} environment
 */
export const createFixture = async (
  t,
  archivePath,
  dependencies = {},
  environment = fixtureEnvironment()
) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-consumer-'))
  t.after(async () => rm(cwd, { recursive: true, force: true }))
  const { packageManager } = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'))

  await cp(archivePath, join(cwd, 'atls-raijin.tgz'))
  await mkdir(join(cwd, '.yarn/releases'), { recursive: true })
  const fixtureRuntimePath = join(cwd, '.yarn/releases/yarn.mjs')
  await cp(runtimePath, fixtureRuntimePath)
  await writeFile(
    join(cwd, 'package.json'),
    `${JSON.stringify(
      {
        dependencies: { '@atls/raijin': 'file:./atls-raijin.tgz', ...dependencies },
        name: 'raijin-consumer',
        packageManager,
        private: true,
        type: 'module',
        workspaces: ['packages/*'],
      },
      null,
      2
    )}\n`
  )
  await writeFile(
    join(cwd, '.yarnrc.yml'),
    'nodeLinker: pnp\npnpEnableEsmLoader: true\nyarnPath: .yarn/releases/yarn.mjs\n'
  )

  /** @param {string} command @param {string[]} args @param {string} directory */
  const run = async (command, args, directory = cwd) =>
    execute(command, args, directory, environment)
  /** @param {string[]} args @param {string} directory */
  const runYarn = async (args, directory = cwd) =>
    run(process.execPath, [fixtureRuntimePath, ...args], directory)

  return { cwd, run, runYarn }
}
