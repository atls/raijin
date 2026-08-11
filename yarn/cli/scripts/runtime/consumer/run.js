import { execFile } from 'node:child_process'
import { cp } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import { mkdtemp } from 'node:fs/promises'
import { rm } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { selectScenarios } from './scenarios.js'

const execFileAsync = promisify(execFile)

const createEnvironment = () => {
  const environment = { ...process.env }

  delete environment.NODE_OPTIONS
  delete environment.NODE_PATH
  delete environment.RAIJIN_CLI_INVENTORY
  delete environment.YARN_IGNORE_PATH

  return environment
}

/**
 * @param {string} command
 * @param {Array<string>} args
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} environment
 */
const execute = async (command, args, cwd, environment) => {
  const { stdout } = await execFileAsync(command, args, {
    cwd,
    encoding: 'utf8',
    env: environment,
  })

  return stdout
}

/**
 * @param {{
 *   archivePath: string,
 *   environment: NodeJS.ProcessEnv,
 *   expectedVersion: string,
 *   packageManager: string,
 *   runtimePath: string,
 *   scenario: ReturnType<typeof selectScenarios>[number]
 * }} options
 */
const runScenario = async ({
  archivePath,
  environment,
  expectedVersion,
  packageManager,
  runtimePath,
  scenario,
}) => {
  const fixtureCwd = await mkdtemp(join(tmpdir(), `raijin-${scenario.name}-consumer-`))
  const fixtureRuntimePath = join(fixtureCwd, '.yarn/releases/yarn.mjs')

  /** @param {Array<string>} args @param {string} [cwd] */
  const runYarn = async (args, cwd = fixtureCwd) => execute('yarn', args, cwd, environment)

  try {
    await cp(archivePath, join(fixtureCwd, 'atls-raijin.tgz'))
    await mkdir(join(fixtureCwd, '.yarn/releases'), { recursive: true })
    await cp(runtimePath, fixtureRuntimePath)
    await writeFile(
      join(fixtureCwd, 'package.json'),
      `${JSON.stringify(
        {
          dependencies: {
            '@atls/raijin': 'file:./atls-raijin.tgz',
            ...scenario.dependencies,
          },
          name: `raijin-${scenario.name}-consumer`,
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
      join(fixtureCwd, '.yarnrc.yml'),
      ['nodeLinker: pnp', 'pnpEnableEsmLoader: true', 'yarnPath: .yarn/releases/yarn.mjs', ''].join(
        '\n'
      )
    )

    await scenario.prepare(fixtureCwd)

    await runYarn(['install', '--no-immutable'])

    const version = (await runYarn(['--version'])).trim()

    if (version !== expectedVersion) {
      throw new Error(
        `Disposable consumer loaded Yarn ${version} instead of checked runtime ${expectedVersion}`
      )
    }

    await scenario.run({ fixtureCwd, runYarn })
    process.stdout.write(`Disposable ${scenario.name} PnP consumer passed (${version})\n`)
  } finally {
    await rm(fixtureCwd, { recursive: true, force: true })
  }
}

/**
 * @param {{
 *   archivePath?: string,
 *   packageManager: string,
 *   runtimePath: string,
 *   scenarioName?: string
 * }} options
 */
export const runConsumers = async ({ archivePath, packageManager, runtimePath, scenarioName }) => {
  const environment = createEnvironment()
  let archiveRoot
  let resolvedArchivePath = archivePath

  if (!resolvedArchivePath) {
    archiveRoot = await mkdtemp(join(tmpdir(), 'raijin-consumer-'))
    resolvedArchivePath = join(archiveRoot, 'atls-raijin.tgz')
  }
  const expectedVersion = (
    await execute(process.execPath, [runtimePath, '--version'], process.cwd(), {
      ...environment,
      YARN_IGNORE_PATH: '1',
    })
  ).trim()

  try {
    if (!archivePath) {
      await execute(
        'yarn',
        ['workspace', '@atls/raijin', 'pack', '--out', resolvedArchivePath],
        process.cwd(),
        environment
      )
    }

    for (const scenario of selectScenarios(scenarioName)) {
      // eslint-disable-next-line no-await-in-loop
      await runScenario({
        archivePath: resolvedArchivePath,
        environment,
        expectedVersion,
        packageManager,
        runtimePath,
        scenario,
      })
    }
  } finally {
    if (archiveRoot) {
      await rm(archiveRoot, { recursive: true, force: true })
    }
  }
}
