import type { TemporaryDirectoryProvider } from './executor.interfaces.js'

import assert                              from 'node:assert/strict'
import { mkdir }                           from 'node:fs/promises'
import { mkdtemp }                         from 'node:fs/promises'
import { rm }                              from 'node:fs/promises'
import { writeFile }                       from 'node:fs/promises'
import { tmpdir }                          from 'node:os'
import { dirname }                         from 'node:path'
import { join }                            from 'node:path'
import { after }                           from 'node:test'
import { before }                          from 'node:test'
import { test }                            from 'node:test'
import { fileURLToPath }                   from 'node:url'

import { Configuration }                   from '@yarnpkg/core'
import { Project }                         from '@yarnpkg/core'
import { getPluginConfiguration }          from '@yarnpkg/cli'
import { structUtils }                     from '@yarnpkg/core'
import { npath }                           from '@yarnpkg/fslib'

import { createYarnManagedNodeExecutor }   from './executor.js'
import { loadProjectPnpApi }               from './pnp-api.js'

const testCwd = npath.toPortablePath(dirname(fileURLToPath(import.meta.url)))
const findTestProject = async (): ReturnType<typeof Project.find> => {
  const configuration = await Configuration.find(testCwd, getPluginConfiguration())

  return Project.find(configuration, testCwd)
}
const testProject = findTestProject()
let program = ''
let programDirectory = ''

before(async () => {
  const { workspace } = await testProject
  assert.ok(workspace)
  const fixtureRoot = join(npath.fromPortablePath(workspace.cwd), '.yarn/raijin')

  await mkdir(fixtureRoot, { recursive: true })
  programDirectory = await mkdtemp(join(fixtureRoot, 'node-executor-program-'))
  program = join(programDirectory, 'program.ts')

  await writeFile(
    join(programDirectory, '-fixture.ts'),
    `process.stdout.write(process.argv[2] ?? '')
`
  )
  await writeFile(
    program,
    `const mode = process.argv[2]

switch (mode) {
  case 'binary': {
    const { spawnSync } = await import('node:child_process')
    const result = spawnSync('tsc', ['--version'], { encoding: 'utf8' })

    if (result.error) {
      throw result.error
    }

    process.stdout.write(result.stdout ?? '')
    process.stderr.write(result.stderr ?? '')
    process.exitCode = result.status ?? 1
    break
  }
  case 'fail':
    process.exitCode = 7
    break
  case 'report': {
    const { Configuration } = await import('@yarnpkg/core')

    process.stdout.write(JSON.stringify({
      argument: process.argv[3],
      callerTitle: process.title,
      dependencyLoaded: typeof Configuration === 'function',
      preserved: process.env.RAIJIN_TEST_VALUE,
      removed: process.env.RAIJIN_REMOVE_ME,
    }))
    break
  }
  case 'signal':
    process.kill(process.pid, 'SIGTERM')
    break
  case 'stream':
    process.stdout.write('x'.repeat(256 * 1024))
    break
  case 'wait':
    setInterval(() => undefined, 1000)
    break
  default:
    throw new Error(\`Unsupported managed Node fixture mode: \${mode}\`)
}
`
  )
})

after(async () => {
  await rm(programDirectory, { force: true, recursive: true })
})

const createTemporaryDirectoryProvider = (
  cleanupFailure?: Error
): { provider: TemporaryDirectoryProvider; removed: Array<string> } => {
  const removed: Array<string> = []

  return {
    removed,
    provider: {
      create: async () => {
        const path = await mkdtemp(join(tmpdir(), 'raijin-node-executor-test-'))

        return {
          path,
          remove: async () => {
            removed.push(path)

            if (cleanupFailure) {
              throw cleanupFailure
            }

            await rm(path, { force: true, recursive: true })
          },
        }
      },
    },
  }
}

test('should execute TypeScript through the project PnP environment', async () => {
  const { project, workspace } = await testProject
  assert.ok(workspace)

  const temporaryDirectories = createTemporaryDirectoryProvider()
  const nodeOptionsName = process.platform === 'win32' ? 'Node_Options' : 'NODE_OPTIONS'
  const executor = createYarnManagedNodeExecutor({
    baseEnvironment: {
      ...process.env,
      [nodeOptionsName]: '--title=raijin-caller --trace-warnings',
      RAIJIN_REMOVE_ME: 'remove-me',
    },
    locator: workspace.anchoredLocator,
    project,
    temporaryDirectories: temporaryDirectories.provider,
  })
  const result = await executor.execute({
    arguments: ['report', 'argument-value'],
    cwd: npath.fromPortablePath(project.cwd),
    environment: {
      RAIJIN_REMOVE_ME: undefined,
      RAIJIN_TEST_VALUE: 'preserved-value',
    },
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assert.ok(Number(process.versions.node.split('.')[0]) >= 24)
  assert.equal(
    result.reason,
    'completed',
    result.reason === 'start-failed' && result.cause instanceof Error
      ? result.cause.stack
      : undefined
  )
  assert.equal(result.exitCode, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), {
    argument: 'argument-value',
    callerTitle: 'raijin-caller',
    dependencyLoaded: true,
    preserved: 'preserved-value',
  })
  assert.equal(temporaryDirectories.removed.length, 1)
})

test('should expose locator-accessible binaries through the managed environment', async () => {
  const { project, workspace } = await testProject
  assert.ok(workspace)

  const baseEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => name.toUpperCase() !== 'PATH')
  )
  const temporaryDirectories = createTemporaryDirectoryProvider()
  const executor = createYarnManagedNodeExecutor({
    baseEnvironment: { ...baseEnvironment, PATH: '' },
    locator: workspace.anchoredLocator,
    project,
    temporaryDirectories: temporaryDirectories.provider,
  })
  const result = await executor.execute({
    arguments: ['binary'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assert.equal(
    result.reason,
    'completed',
    result.reason === 'start-failed' && result.cause instanceof Error
      ? result.cause.stack
      : undefined
  )
  assert.equal(result.exitCode, 0, result.stderr)
  assert.match(result.stdout, /^Version \d+\.\d+\.\d+/u)
  assert.equal(temporaryDirectories.removed.length, 1)
})

test('should execute a relative program whose name starts with an option prefix', async () => {
  const { project } = await testProject
  const temporaryDirectories = createTemporaryDirectoryProvider()
  const executor = createYarnManagedNodeExecutor({
    project,
    temporaryDirectories: temporaryDirectories.provider,
  })
  const result = await executor.execute({
    arguments: ['argument-value'],
    cwd: npath.toPortablePath(programDirectory),
    input: 'ignore',
    output: { mode: 'capture' },
    program: '-fixture.ts',
  })

  assert.equal(
    result.reason,
    'completed',
    result.reason === 'start-failed' && result.cause instanceof Error
      ? result.cause.stack
      : undefined
  )
  assert.equal(result.exitCode, 0, result.stderr)
  assert.equal(result.stdout, 'argument-value')
  assert.equal(temporaryDirectories.removed.length, 1)
})

test('should restore install state before preparing a dependency locator environment', async () => {
  const source = await findTestProject()
  assert.ok(source.workspace)
  await source.project.restoreInstallState()

  const pnpApi = loadProjectPnpApi(source.project)
  const locator = Array.from(source.project.storedPackages.values()).find(
    (pkg) =>
      pkg.bin.has('tsc') &&
      pnpApi.getPackageInformation({
        name: structUtils.stringifyIdent(pkg),
        reference: pkg.reference,
      }) !== null
  )
  assert.ok(locator)

  const fresh = await findTestProject()
  assert.equal(fresh.project.storedPackages.has(locator.locatorHash), false)

  const baseEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => name.toUpperCase() !== 'PATH')
  )
  const temporaryDirectories = createTemporaryDirectoryProvider()
  const executor = createYarnManagedNodeExecutor({
    baseEnvironment: { ...baseEnvironment, PATH: '' },
    locator,
    project: fresh.project,
    temporaryDirectories: temporaryDirectories.provider,
  })
  const result = await executor.execute({
    arguments: ['binary'],
    cwd: npath.fromPortablePath(fresh.project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assert.equal(
    result.reason,
    'completed',
    result.reason === 'start-failed' && result.cause instanceof Error
      ? result.cause.stack
      : undefined
  )
  assert.equal(result.exitCode, 0, result.stderr)
  assert.match(result.stdout, /^Version \d+\.\d+\.\d+/u)
  assert.equal(temporaryDirectories.removed.length, 1)
})

test('should preserve a non-zero exit as a completed execution', async () => {
  const { project } = await testProject
  const temporaryDirectories = createTemporaryDirectoryProvider()
  const executor = createYarnManagedNodeExecutor({
    project,
    temporaryDirectories: temporaryDirectories.provider,
  })
  const result = await executor.execute({
    arguments: ['fail'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assert.equal(result.reason, 'completed')
  assert.equal(result.exitCode, 7)
  assert.equal(temporaryDirectories.removed.length, 1)
})

test('should expose output through the application handler contract', async () => {
  const { project } = await testProject
  const events: Array<{ data: string; source: 'stderr' | 'stdout' }> = []
  const executor = createYarnManagedNodeExecutor({ project })
  const result = await executor.execute({
    arguments: ['report', 'handled-value'],
    cwd: npath.fromPortablePath(project.cwd),
    environment: { RAIJIN_TEST_VALUE: 'handled-environment' },
    input: 'ignore',
    output: { mode: 'handle', handler: (event) => events.push(event) },
    program,
  })

  assert.equal(result.reason, 'completed')
  assert.equal(result.stdout, '')
  const report = JSON.parse(
    events
      .filter(({ source }) => source === 'stdout')
      .map(({ data }) => data)
      .join('')
  ) as Record<string, unknown>

  assert.equal(report.argument, 'handled-value')
  assert.equal(report.dependencyLoaded, true)
  assert.equal(report.preserved, 'handled-environment')
})

test('should type environment preparation failures and remove temporary resources', async () => {
  const { project } = await testProject
  const temporaryDirectories = createTemporaryDirectoryProvider()
  const executor = createYarnManagedNodeExecutor({
    project,
    temporaryDirectories: temporaryDirectories.provider,
  })
  const result = await executor.execute({
    arguments: ['report', 'unused'],
    cwd: npath.fromPortablePath(project.cwd),
    environment: { PROJECT_CWD: '/unsupported' },
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assert.equal(result.reason, 'start-failed')
  assert.equal(temporaryDirectories.removed.length, 1)
})

test('should cancel execution and remove its temporary directory', async () => {
  const { project } = await testProject
  const temporaryDirectories = createTemporaryDirectoryProvider()
  const executor = createYarnManagedNodeExecutor({
    project,
    temporaryDirectories: temporaryDirectories.provider,
  })
  const result = await executor.execute({
    arguments: ['wait'],
    cancelSignal: AbortSignal.timeout(50),
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assert.equal(result.reason, 'cancelled')
  assert.equal(temporaryDirectories.removed.length, 1)
})

test('should time out execution and remove its temporary directory', async () => {
  const { project } = await testProject
  const temporaryDirectories = createTemporaryDirectoryProvider()
  const executor = createYarnManagedNodeExecutor({
    project,
    temporaryDirectories: temporaryDirectories.provider,
  })
  const result = await executor.execute({
    arguments: ['wait'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
    timeoutMs: 50,
  })

  assert.equal(result.reason, 'timed-out')
  assert.equal(temporaryDirectories.removed.length, 1)
})

test(
  'should preserve signal termination and remove its temporary directory',
  { skip: process.platform === 'win32' },
  async () => {
    const { project } = await testProject
    const temporaryDirectories = createTemporaryDirectoryProvider()
    const executor = createYarnManagedNodeExecutor({
      project,
      temporaryDirectories: temporaryDirectories.provider,
    })
    const result = await executor.execute({
      arguments: ['signal'],
      cwd: npath.fromPortablePath(project.cwd),
      input: 'ignore',
      output: { mode: 'capture' },
      program,
    })

    assert.equal(result.reason, 'signalled')
    assert.equal(result.signal, 'SIGTERM')
    assert.equal(temporaryDirectories.removed.length, 1)
  }
)

test('should wait for captured output before completing', async () => {
  const { project } = await testProject
  const executor = createYarnManagedNodeExecutor({ project })
  const result = await executor.execute({
    arguments: ['stream'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assert.equal(result.reason, 'completed')
  assert.equal(result.stdout.length, 256 * 1024)
})

test('should report cleanup failure without discarding the process result', async () => {
  const { project } = await testProject
  const cleanupFailure = new Error('cleanup failed')
  const temporaryDirectories = createTemporaryDirectoryProvider(cleanupFailure)
  const executor = createYarnManagedNodeExecutor({
    project,
    temporaryDirectories: temporaryDirectories.provider,
  })
  const result = await executor.execute({
    arguments: ['fail'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assert.equal(result.reason, 'cleanup-failed')
  assert.equal(result.cause, cleanupFailure)
  assert.equal(result.execution.reason, 'completed')
  assert.equal(result.execution.exitCode, 7)
  assert.equal(temporaryDirectories.removed.length, 1)
  await rm(temporaryDirectories.removed[0], { force: true, recursive: true })
})
