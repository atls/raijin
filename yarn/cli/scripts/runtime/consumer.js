import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
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
const supportedNodeLinkers = ['node-modules', 'pnp']
const supportedScenarios = ['project-generation', 'surface']
const [
  runtimeArgument,
  packageManager,
  scenarioArgument = 'surface',
  nodeLinkerArgument = 'pnp',
  archiveArgument,
] = process.argv.slice(2)

if (
  !runtimeArgument ||
  !packageManager ||
  !supportedScenarios.includes(scenarioArgument) ||
  !supportedNodeLinkers.includes(nodeLinkerArgument)
) {
  throw new Error(
    'Usage: consumer.js <runtime-path> <package-manager> [surface|project-generation] [pnp|node-modules] [raijin-archive]'
  )
}

if (scenarioArgument === 'surface' && nodeLinkerArgument !== 'pnp') {
  throw new Error('The full surface consumer is supported only with Yarn PnP')
}

const runtimePath = resolve(process.cwd(), runtimeArgument)
const fixtureCwd = await mkdtemp(
  join(tmpdir(), `raijin-${scenarioArgument}-${nodeLinkerArgument}-consumer-`)
)
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

/** @param {Array<string>} args */
const runYarn = async (args, cwd = fixtureCwd) => {
  const { stdout } = await execFileAsync('yarn', args, {
    cwd,
    encoding: 'utf8',
    env: environment,
  })

  return stdout
}

const writeSurfaceFixture = async () => {
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
}

const writeProjectGenerationFixture = async () => {
  const generatedTarget = join(fixtureCwd, 'packages/generated')
  const invalidTarget = join(fixtureCwd, 'packages/invalid')

  await Promise.all(
    [
      [generatedTarget, 'fixture-generated'],
      [invalidTarget, 'fixture-invalid'],
    ].map(async ([target, name]) => {
      await mkdir(target, { recursive: true })
      await Promise.all([
        writeFile(
          join(target, 'package.json'),
          `${JSON.stringify(
            {
              name,
              private: true,
              scripts: { start: 'yarn node dist/index.js' },
              type: 'module',
            },
            null,
            2
          )}\n`
        ),
        writeFile(
          join(target, 'tsconfig.json'),
          `${JSON.stringify({ compilerOptions: { baseUrl: '.' }, include: ['src'] }, null, 2)}\n`
        ),
        writeFile(join(target, '.gitignore'), 'node_modules\n.consumer-private\n'),
      ])
    })
  )

  await writeFile(
    join(fixtureCwd, 'run-project-generation.mjs'),
    [
      "import { resolve } from 'node:path'",
      "import { createInstalledProjectScaffolder } from '@atls/raijin/infrastructure/generation/project'",
      "import { generateProject } from '@atls/raijin/application/generation/project'",
      "import { getPluginConfiguration } from '@yarnpkg/cli'",
      "import { Configuration, Project } from '@yarnpkg/core'",
      "import { npath } from '@yarnpkg/fslib'",
      '',
      'const targetCwd = npath.toPortablePath(resolve(process.argv[2]))',
      'const configuration = await Configuration.find(targetCwd, getPluginConfiguration())',
      'const { project } = await Project.find(configuration, targetCwd)',
      'const scaffolder = createInstalledProjectScaffolder({ configuration, project, targetCwd })',
      "const result = await generateProject({ scaffoldType: 'project' }, { scaffolder })",
      '',
      "if (result.status !== 'generated') throw new Error(result.failure.message)",
      "console.log('Packed project generation adapter passed')",
      '',
    ].join('\n')
  )

  return { generatedTarget, invalidTarget }
}

const verifyGeneratedProject = async (target) => {
  const requiredFiles = [
    '.config/husky/pre-commit',
    '.github/workflows/checks.yaml',
    '.github/workflows/preview.yaml',
    '.github/workflows/release.yaml',
    '.prettierrc.mjs',
    'eslint.config.mjs',
  ]

  await Promise.all(requiredFiles.map(async (path) => access(join(target, path))))

  const gitIgnore = await readFile(join(target, '.gitignore'), 'utf8')
  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
  const typeScript = JSON.parse(await readFile(join(target, 'tsconfig.json'), 'utf8'))
  const workflows = await Promise.all(
    ['checks.yaml', 'preview.yaml', 'release.yaml'].map(async (name) =>
      readFile(join(target, '.github/workflows', name), 'utf8')
    )
  )
  const workflowContent = workflows.join('\n')

  if (gitIgnore !== 'node_modules\n.consumer-private\n') {
    throw new Error(`Project generation changed the existing .gitignore: ${gitIgnore}`)
  }

  if (manifest.scripts?.start !== 'yarn node dist/index.js') {
    throw new Error('Project generation changed existing package scripts')
  }

  if (typeScript.compilerOptions?.module !== 'NodeNext') {
    throw new Error('Project generation did not apply the TypeScript baseline')
  }

  for (const expected of [
    'actions/checkout@v6',
    'actions/setup-node@v6',
    "node-version: '24'",
    'ghcr.io',
  ]) {
    if (!workflowContent.includes(expected)) {
      throw new Error(`Generated workflows are missing ${expected}`)
    }
  }

  if (/18\.19|eu\.gcr\.io|GCR_KEYFILE|GCR_PROJECT_ID/.test(workflowContent)) {
    throw new Error('Generated workflows retain the retired Node or GCR policy')
  }
}

const runProjectGenerationScenario = async ({ generatedTarget, invalidTarget }) => {
  if (nodeLinkerArgument === 'pnp') {
    const output = await runYarn(['generate', 'project', '--type', 'project'], generatedTarget)

    if (!output.includes('CREATE /eslint.config.mjs')) {
      throw new Error(`Project generation did not report generated changes: ${output}`)
    }

    try {
      await runYarn(['generate', 'project', '--type', 'service'], invalidTarget)
      throw new Error('Invalid project scaffold type unexpectedly succeeded')
    } catch (error) {
      const errorOutput = `${error?.stdout ?? ''}${error?.stderr ?? ''}`

      if (!errorOutput.includes('Unsupported project scaffold type "service"')) {
        throw error
      }
    }
  } else {
    await runYarn(['node', './run-project-generation.mjs', generatedTarget])
  }

  await verifyGeneratedProject(generatedTarget)
}

const runSurfaceScenario = async () => {
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
    scenarioArgument === 'project-generation'
      ? {
          '@yarnpkg/cli': '4.14.1',
          '@yarnpkg/core': '4.7.0',
          '@yarnpkg/fslib': '3.1.5',
        }
      : { 'fixture-prettier-config': 'portal:./prettier-config' }

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
    [
      `nodeLinker: ${nodeLinkerArgument}`,
      ...(nodeLinkerArgument === 'pnp' ? ['pnpEnableEsmLoader: true'] : []),
      'yarnPath: .yarn/releases/yarn.mjs',
      '',
    ].join('\n')
  )

  const projectGenerationFixture =
    scenarioArgument === 'project-generation' ? await writeProjectGenerationFixture() : undefined

  if (scenarioArgument === 'surface') {
    await writeSurfaceFixture()
  }

  await runYarn(['install', '--no-immutable'])

  const version = (await runYarn(['--version'])).trim()

  if (version !== expectedVersion) {
    throw new Error(
      `Disposable consumer loaded Yarn ${version} instead of checked runtime ${expectedVersion}`
    )
  }

  if (projectGenerationFixture) {
    await runProjectGenerationScenario(projectGenerationFixture)
  } else {
    await runSurfaceScenario()
  }

  process.stdout.write(
    `Disposable ${scenarioArgument} consumer passed with ${nodeLinkerArgument} (${version})\n`
  )
} finally {
  await rm(fixtureCwd, { recursive: true, force: true })
}
