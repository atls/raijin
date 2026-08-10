import assert                        from 'node:assert/strict'
import { test }                      from 'node:test'

import { scriptUtils }               from '@yarnpkg/core'
import { npath }                     from '@yarnpkg/fslib'

import { assertCompleted }           from './assert-completed.js'
import { createExecutor }            from './create-executor.js'
import { createProjectContext }      from './create-project-context.js'
import { resolveFixturePath }        from './resolve-fixture-path.js'
import { trackTemporaryDirectories } from './track-temporary-directories.js'

const entry = resolveFixturePath('entry.ts')

test('should execute TypeScript through the project PnP environment', async (context) => {
  const { project, workspace } = await createProjectContext()
  const callerNodeOptions = '--title=raijin-caller --trace-warnings'
  const removed = trackTemporaryDirectories(context)
  const nodeOptionsName = process.platform === 'win32' ? 'Node_Options' : 'NODE_OPTIONS'
  const executor = createExecutor({
    baseEnvironment: {
      ...process.env,
      [nodeOptionsName]: callerNodeOptions,
      RAIJIN_REMOVE_ME: 'remove-me',
    },
    locator: workspace.anchoredLocator,
    project,
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
    entry,
  })

  assert.ok(Number(process.versions.node.split('.')[0]) >= 24)
  assertCompleted(result)
  assert.equal(result.exitCode, 0, result.stderr)
  const report = JSON.parse(result.stdout) as Record<string, unknown>
  const { nodeOptions } = report

  assert.ok(typeof nodeOptions === 'string')
  assert.ok(nodeOptions.includes(callerNodeOptions))
  assert.deepEqual(report, {
    argument: 'argument-value',
    callerTitle: 'raijin-caller',
    dependencyLoaded: true,
    nodeOptions,
    preserved: 'preserved-value',
  })
  assert.equal(removed.length, 1)
})

test('should expose locator-accessible binaries through Yarn hooks', async (context) => {
  const { project, workspace } = await createProjectContext()
  const baseEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => name.toUpperCase() !== 'PATH')
  )
  const removed = trackTemporaryDirectories(context)
  const executor = createExecutor({
    baseEnvironment: { ...baseEnvironment, PATH: '' },
    locator: workspace.anchoredLocator,
    project,
  })
  const result = await executor.execute({
    arguments: ['binary'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    entry,
  })

  assertCompleted(result)
  assert.equal(result.exitCode, 0, result.stderr)
  assert.match(result.stdout, /^Version \d+\.\d+\.\d+/u)
  assert.equal(removed.length, 1)
})

test('should restore install state before preparing a dependency locator environment', async (context) => {
  const source = await createProjectContext()
  await source.project.restoreInstallState()

  const binaries = await scriptUtils.getPackageAccessibleBinaries(
    source.workspace.anchoredLocator,
    { project: source.project }
  )
  const binary = binaries.get('tsc')
  assert.ok(binary)
  const [locator] = binary

  const fresh = await createProjectContext()
  assert.equal(fresh.project.storedPackages.has(locator.locatorHash), false)

  const baseEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => name.toUpperCase() !== 'PATH')
  )
  const removed = trackTemporaryDirectories(context)
  const executor = createExecutor({
    baseEnvironment: { ...baseEnvironment, PATH: '' },
    locator,
    project: fresh.project,
  })
  const result = await executor.execute({
    arguments: ['binary'],
    cwd: npath.fromPortablePath(fresh.project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    entry,
  })

  assertCompleted(result)
  assert.equal(result.exitCode, 0, result.stderr)
  assert.match(result.stdout, /^Version \d+\.\d+\.\d+/u)
  assert.equal(removed.length, 1)
})

test('should return a stable failure when a managed environment name is overridden', async (context) => {
  const { project } = await createProjectContext()
  const removed = trackTemporaryDirectories(context)
  const executor = createExecutor({ project })
  const result = await executor.execute({
    arguments: ['report', 'unused'],
    cwd: npath.fromPortablePath(project.cwd),
    environment: { PROJECT_CWD: '/unsupported' },
    input: 'ignore',
    output: { mode: 'capture' },
    entry,
  })

  assert.deepEqual(result, {
    reason: 'start-failed',
    stderr: '',
    stdout: '',
  })
  assert.equal(removed.length, 1)
})
