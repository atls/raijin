import type { ProjectScaffoldType } from '@atls/raijin/application/generation'

import assert                       from 'node:assert/strict'
import { execFile }                 from 'node:child_process'
import { cp }                       from 'node:fs/promises'
import { mkdir }                    from 'node:fs/promises'
import { mkdtemp }                  from 'node:fs/promises'
import { readFile }                 from 'node:fs/promises'
import { readdir }                  from 'node:fs/promises'
import { rm }                       from 'node:fs/promises'
import { writeFile }                from 'node:fs/promises'
import { tmpdir }                   from 'node:os'
import { join }                     from 'node:path'
import { relative }                 from 'node:path'
import { resolve }                  from 'node:path'
import { sep }                      from 'node:path'
import { promisify }                from 'node:util'

type NodeLinker = 'node-modules' | 'pnp'

interface CommandExecutionError extends Error {
  readonly code?: number | string
  readonly stderr?: Buffer | string
  readonly stdout?: Buffer | string
}

const execFileAsync = promisify(execFile)
const nodeLinkers = ['node-modules', 'pnp'] as const
const [runtimeArgument, packageManager, nodeLinkerArgument] = process.argv.slice(2)

const isNodeLinker = (value: string): value is NodeLinker =>
  (nodeLinkers as ReadonlyArray<string>).includes(value)

const nodeLinker =
  nodeLinkerArgument && isNodeLinker(nodeLinkerArgument) ? nodeLinkerArgument : undefined

if (!runtimeArgument || !packageManager || !nodeLinker) {
  throw new Error(
    'Usage: smoke-generate-project.ts <runtime-path> <package-manager> <pnp|node-modules>'
  )
}

const repoRoot = process.cwd()
const runtimePath = resolve(repoRoot, runtimeArgument)
const temporaryRoot = await mkdtemp(
  join(tmpdir(), `raijin-generate-project-${nodeLinker}-consumer-`)
)
const packageArchivePath = join(temporaryRoot, 'atls-raijin.tgz')
const fixtureRoot = join(temporaryRoot, 'consumer')
const fixtureRuntimePath = join(fixtureRoot, '.yarn/releases/yarn.mjs')
const environment = { ...process.env }

delete environment.NODE_OPTIONS
delete environment.NODE_PATH
delete environment.RAIJIN_CLI_INVENTORY
delete environment.YARN_IGNORE_PATH

const expectedCommonFiles = [
  '.config/husky/.gitignore',
  '.config/husky/commit-msg',
  '.config/husky/pre-commit',
  '.config/husky/prepare-commit-msg',
  '.github/workflows/checks.yaml',
  '.gitignore',
  '.prettierrc.mjs',
  'eslint.config.mjs',
  'package.json',
  'tsconfig.json',
]

const scaffoldFiles: Record<ProjectScaffoldType, Array<string>> = {
  library: ['.github/workflows/publish.yaml', '.github/workflows/version.yaml'],
  project: ['.github/workflows/preview.yaml', '.github/workflows/release.yaml'],
}

const runProcess = async (
  file: string,
  args: Array<string>,
  cwd: string
): Promise<{ stdout: string; stderr: string }> =>
  (await execFileAsync(file, args, {
    cwd,
    encoding: 'utf8',
    env: environment,
  })) as { stdout: string; stderr: string }

const runYarn = async (
  args: Array<string>,
  cwd = fixtureRoot
): Promise<{ stdout: string; stderr: string }> => runProcess('yarn', args, cwd)

const listFiles = async (root: string, current = root): Promise<Array<string>> => {
  const entries = await readdir(current, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(current, entry.name)

      if (entry.isDirectory()) {
        return listFiles(root, entryPath)
      }

      return entry.isFile() ? [relative(root, entryPath).split(sep).join('/')] : []
    })
  )

  return files.flat().sort()
}

const createTarget = async (name: string): Promise<string> => {
  const target = join(fixtureRoot, 'packages', name)

  await mkdir(target, { recursive: true })
  await writeFile(
    join(target, 'package.json'),
    `${JSON.stringify({ name: `fixture-${name}`, private: true }, null, 2)}\n`
  )
  await writeFile(
    join(target, 'tsconfig.json'),
    `${JSON.stringify({ compilerOptions: { baseUrl: '.' }, include: ['src'] }, null, 2)}\n`
  )
  await writeFile(join(target, '.gitignore'), 'node_modules\n.idea/\n')

  return target
}

const assertGeneratedScaffold = async (
  target: string,
  scaffoldType: ProjectScaffoldType
): Promise<void> => {
  assert.deepEqual(
    await listFiles(target),
    [...expectedCommonFiles, ...scaffoldFiles[scaffoldType]].sort()
  )
  assert.equal(
    await readFile(join(target, '.prettierrc.mjs'), 'utf8'),
    "import config from '@atls/raijin/prettier'\n\nexport default config\n"
  )
  assert.equal(
    await readFile(join(target, '.config/husky/pre-commit'), 'utf8'),
    'yarn commit staged\n'
  )

  const gitIgnore = await readFile(join(target, '.gitignore'), 'utf8')
  const tsconfig = JSON.parse(await readFile(join(target, 'tsconfig.json'), 'utf8')) as {
    compilerOptions: Record<string, unknown>
    include: Array<string>
  }

  assert.match(gitIgnore, /# raijin:begin project-specific gitignore\n\.idea\/\n/)
  assert.equal(tsconfig.compilerOptions.baseUrl, '.')
  assert.equal(tsconfig.compilerOptions.module, 'NodeNext')
  assert.deepEqual(tsconfig.include, ['src'])

  if (scaffoldType === 'project') {
    const preview = await readFile(join(target, '.github/workflows/preview.yaml'), 'utf8')

    assert.match(preview, /fixture-project-/)
  } else {
    const publish = await readFile(join(target, '.github/workflows/publish.yaml'), 'utf8')

    assert.match(publish, /workspaces changed foreach/)
  }
}

const assertGeneratedScaffoldCommand = async (
  target: string,
  scaffoldType: ProjectScaffoldType
): Promise<void> => {
  const { stdout } = await runYarn(['generate', 'project', '--type', scaffoldType], target)

  assert.match(stdout, /CREATE \/eslint\.config\.mjs/)
  await assertGeneratedScaffold(target, scaffoldType)
}

const isCommandExecutionError = (error: unknown): error is CommandExecutionError =>
  error instanceof Error && 'code' in error && 'stdout' in error && 'stderr' in error

const getOutput = (value: Buffer | string | undefined): string => {
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8')
  }

  return value ?? ''
}

try {
  await runProcess(
    'yarn',
    ['workspace', '@atls/raijin', 'pack', '--out', packageArchivePath],
    repoRoot
  )
  await mkdir(join(fixtureRoot, '.yarn/releases'), { recursive: true })
  await cp(runtimePath, fixtureRuntimePath)
  await writeFile(
    join(fixtureRoot, 'package.json'),
    `${JSON.stringify(
      {
        devDependencies: {
          '@atls/raijin': `file:${packageArchivePath}`,
        },
        name: 'raijin-generate-project-consumer',
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
    join(fixtureRoot, '.yarnrc.yml'),
    [
      `nodeLinker: ${nodeLinker}`,
      ...(nodeLinker === 'pnp' ? ['pnpEnableEsmLoader: true'] : []),
      'yarnPath: .yarn/releases/yarn.mjs',
      '',
    ].join('\n')
  )

  const targets: Record<ProjectScaffoldType | 'invalid', string> = {
    invalid: await createTarget('invalid'),
    library: await createTarget('library'),
    project: await createTarget('project'),
  }

  await runYarn(['install', '--no-immutable'])

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
  const { stdout: actualVersionOutput } = await runYarn(['--version'])

  assert.equal(actualVersionOutput.trim(), String(expectedVersionOutput).trim())

  await assertGeneratedScaffoldCommand(targets.project, 'project')
  await assertGeneratedScaffoldCommand(targets.library, 'library')

  const invalidFiles = await listFiles(targets.invalid)

  await assert.rejects(runYarn(['generate', 'project', '--type', 'service'], targets.invalid), (
    error
  ) => {
    if (!isCommandExecutionError(error)) {
      return false
    }

    assert.equal(error.code, 1)
    assert.match(
      `${getOutput(error.stdout)}${getOutput(error.stderr)}`,
      /Unsupported project scaffold type "service"/
    )

    return true
  })
  assert.deepEqual(await listFiles(targets.invalid), invalidFiles)

  // eslint-disable-next-line no-console
  console.log(`Disposable generate project consumer passed with ${nodeLinker}`)
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}
