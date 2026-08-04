import { execFile } from 'node:child_process'
import { cp } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import { mkdtemp } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { rm } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const [runtimeArgument, packageManager] = process.argv.slice(2)

if (!runtimeArgument || !packageManager) {
  throw new Error('Usage: consumer.mjs <runtime-path> <package-manager>')
}

const runtimePath = resolve(process.cwd(), runtimeArgument)
const raijinManifest = JSON.parse(
  await readFile(new URL('../../../raijin/package.json', import.meta.url), 'utf8')
)
const fixtureCwd = await mkdtemp(join(tmpdir(), 'raijin-cli-surface-consumer-'))
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

/** @param {Array<string>} args */
const runYarn = async (args, cwd = fixtureCwd) => {
  const { stdout } = await execFileAsync('yarn', args, {
    cwd,
    encoding: 'utf8',
    env: environment,
  })

  return stdout
}

try {
  await mkdir(join(fixtureCwd, '.yarn/releases'), { recursive: true })
  await cp(runtimePath, fixtureRuntimePath)
  await writeFile(
    join(fixtureCwd, 'package.json'),
    `${JSON.stringify(
      {
        dependencies: {
          '@atls/raijin': raijinManifest.version,
          'fixture-prettier-config': 'portal:./prettier-config',
        },
        name: 'raijin-cli-surface-consumer',
        packageManager,
        private: true,
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
  await mkdir(join(fixtureCwd, 'prettier-config'))
  await writeFile(
    join(fixtureCwd, 'prettier-config/package.json'),
    `${JSON.stringify(
      {
        exports: './index.mjs',
        name: 'fixture-prettier-config',
        type: 'module',
        version: '1.0.0',
      },
      null,
      2
    )}\n`
  )
  await writeFile(
    join(fixtureCwd, 'prettier-config/index.mjs'),
    'export default { semi: true, singleQuote: false }\n'
  )
  await writeFile(
    join(fixtureCwd, '.prettierrc.mjs'),
    "import config from 'fixture-prettier-config'\n\nexport default config\n"
  )
  await writeFile(join(fixtureCwd, 'source.ts'), "export const value='test'\n")
  await mkdir(join(fixtureCwd, 'packages/target/src/integration'), { recursive: true })
  await mkdir(join(fixtureCwd, 'packages/sibling/src'), { recursive: true })
  await writeFile(
    join(fixtureCwd, 'packages/target/package.json'),
    `${JSON.stringify({ name: 'fixture-target', private: true, type: 'module' }, null, 2)}\n`
  )
  await writeFile(
    join(fixtureCwd, 'packages/sibling/package.json'),
    `${JSON.stringify({ name: 'fixture-sibling', private: true, type: 'module' }, null, 2)}\n`
  )
  await writeFile(
    join(fixtureCwd, 'packages/target/src/target.test.js'),
    ["import test from 'node:test'", "test('fixture-target-unit', () => {})", ''].join('\n')
  )
  await writeFile(
    join(fixtureCwd, 'packages/target/src/integration/target.test.js'),
    ["import test from 'node:test'", "test('fixture-target-integration', () => {})", ''].join('\n')
  )
  await writeFile(
    join(fixtureCwd, 'packages/sibling/src/sibling.test.js'),
    [
      "import test from 'node:test'",
      "test('fixture-sibling-must-not-run', () => { throw new Error('sibling test executed') })",
      '',
    ].join('\n')
  )

  await runYarn(['install', '--no-immutable'])

  const version = (await runYarn(['--version'])).trim()

  if (version !== expectedVersion) {
    throw new Error(
      `Disposable consumer loaded Yarn ${version} instead of checked runtime ${expectedVersion}`
    )
  }

  const commands = [
    ['check', '--help'],
    ['generate', 'project', '--help'],
    ['raijin', 'sync', '--help'],
  ]

  await Promise.all(
    commands.map(async (command) => {
      const output = await runYarn(command)

      if (!output.includes(`yarn ${command.slice(0, -1).join(' ')}`)) {
        throw new Error(`Disposable consumer did not expose "${command.slice(0, -1).join(' ')}"`)
      }
    })
  )

  await runYarn(['format', 'source.ts'])

  const formattedSource = await readFile(join(fixtureCwd, 'source.ts'), 'utf8')

  if (formattedSource !== 'export const value = "test";\n') {
    throw new Error(`Disposable consumer ignored its PnP Prettier config: ${formattedSource}`)
  }

  const targetWorkspaceCwd = join(fixtureCwd, 'packages/target')
  const testScenarios = [
    {
      args: ['test', '--test-reporter=tap'],
      expected: ['fixture-target-unit', 'fixture-target-integration'],
    },
    { args: ['test', 'unit', '--test-reporter=tap'], expected: ['fixture-target-unit'] },
    {
      args: ['test', 'integration', '--test-reporter=tap'],
      expected: ['fixture-target-integration'],
    },
  ]

  await Promise.all(
    testScenarios.map(async (scenario) => {
      const output = await runYarn(scenario.args, targetWorkspaceCwd)

      for (const expected of scenario.expected) {
        if (!output.includes(expected)) {
          throw new Error(`Disposable consumer did not run ${expected}: ${output}`)
        }
      }

      if (output.includes('fixture-sibling-must-not-run')) {
        throw new Error(`Disposable consumer escaped the invocation workspace: ${output}`)
      }
    })
  )

  console.log(`Disposable yarnPath consumer passed (${version})`) // eslint-disable-line no-console
} finally {
  await rm(fixtureCwd, { recursive: true, force: true })
}
