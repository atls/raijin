import { execFile } from 'node:child_process'
import { cp } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import { mkdtemp } from 'node:fs/promises'
import { rm } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import { prepareProjectGeneration } from './consumer/project-generation/prepare.js'
import { runProjectGeneration } from './consumer/project-generation/run.js'
import { prepareSurface } from './consumer/surface/prepare.js'
import { runSurface } from './consumer/surface/run.js'

const execFileAsync = promisify(execFile)
const supportedScenarios = ['project-generation', 'surface']
const [runtimeArgument, packageManager, scenarioArgument = 'surface', archiveArgument] =
  process.argv.slice(2)

if (!runtimeArgument || !packageManager || !supportedScenarios.includes(scenarioArgument)) {
  throw new Error(
    'Usage: consumer.js <runtime-path> <package-manager> [surface|project-generation] [raijin-archive]'
  )
}

const runtimePath = resolve(process.cwd(), runtimeArgument)
const fixtureCwd = await mkdtemp(join(tmpdir(), `raijin-${scenarioArgument}-consumer-`))
const fixtureRaijinArchivePath = join(fixtureCwd, 'atls-raijin.tgz')
const fixtureRuntimePath = join(fixtureCwd, '.yarn/releases/yarn.mjs')
const environment = { ...process.env }

delete environment.NODE_OPTIONS
delete environment.NODE_PATH
delete environment.RAIJIN_CLI_INVENTORY
delete environment.YARN_IGNORE_PATH

const { stdout: expectedVersionOutput } = await execFileAsync(
  process.execPath,
  [runtimePath, '--version'],
  {
    encoding: 'utf8',
    env: {
      ...environment,
      YARN_IGNORE_PATH: '1',
    },
  }
)
const expectedVersion = expectedVersionOutput.trim()

/** @param {Array<string>} args @param {string} [cwd] */
const runYarn = async (args, cwd = fixtureCwd) => {
  const { stdout } = await execFileAsync('yarn', args, {
    cwd,
    encoding: 'utf8',
    env: environment,
  })

  return stdout
}

try {
  if (archiveArgument) {
    await cp(resolve(process.cwd(), archiveArgument), fixtureRaijinArchivePath)
  } else {
    await runYarn(
      ['workspace', '@atls/raijin', 'pack', '--out', fixtureRaijinArchivePath],
      process.cwd()
    )
  }

  await mkdir(join(fixtureCwd, '.yarn/releases'), { recursive: true })
  await cp(runtimePath, fixtureRuntimePath)

  const scenarioDependencies =
    scenarioArgument === 'surface' ? { 'fixture-prettier-config': 'portal:./prettier-config' } : {}

  await writeFile(
    join(fixtureCwd, 'package.json'),
    `${JSON.stringify(
      {
        dependencies: {
          '@atls/raijin': 'file:./atls-raijin.tgz',
          ...scenarioDependencies,
        },
        name: `raijin-${scenarioArgument}-consumer`,
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

  const scenario =
    scenarioArgument === 'project-generation'
      ? await prepareProjectGeneration(fixtureCwd)
      : await prepareSurface(fixtureCwd)

  await runYarn(['install', '--no-immutable'])

  const version = (await runYarn(['--version'])).trim()

  if (version !== expectedVersion) {
    throw new Error(
      `Disposable consumer loaded Yarn ${version} instead of checked runtime ${expectedVersion}`
    )
  }

  if (scenarioArgument === 'project-generation') {
    await runProjectGeneration({ ...scenario, runYarn })
  } else {
    await runSurface({ ...scenario, runYarn })
  }

  process.stdout.write(`Disposable ${scenarioArgument} PnP consumer passed (${version})\n`)
} finally {
  await rm(fixtureCwd, { recursive: true, force: true })
}
