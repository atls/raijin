import type { CommandContext }                                             from '@yarnpkg/core'

import type { EntryInvocation } from '../invocation.interfaces.js'

import assert                                                              from 'node:assert/strict'
import { mkdtemp }                                                         from 'node:fs/promises'
import { rm }                                                              from 'node:fs/promises'
import { writeFile }                                                       from 'node:fs/promises'
import { tmpdir }                                                          from 'node:os'
import { dirname }                                                         from 'node:path'
import { join }                                                            from 'node:path'
import { PassThrough }                                                     from 'node:stream'
import { before }                                                          from 'node:test'
import test                                                                from 'node:test'
import { fileURLToPath }                                                   from 'node:url'

import { Configuration }                                                   from '@yarnpkg/core'
import { Project }                                                         from '@yarnpkg/core'
import { getPluginConfiguration }                                          from '@yarnpkg/cli'
import { npath }                                                           from '@yarnpkg/fslib'
import { ppath }                                                           from '@yarnpkg/fslib'

import { create as createProcessExecutor } from '../../../../infrastructure/process/execa/executor.js'
import { resolveEntryCommandInvocation as resolveEntryInvocation }         from '../entry.js'
import { resolveProjectCommandInvocation as resolveProjectInvocation }     from '../project.js'
import { resolveWorkspaceCommandInvocation as resolveWorkspaceInvocation } from '../workspace.js'

const testCwd = npath.toPortablePath(dirname(fileURLToPath(import.meta.url)))

let repoRoot = testCwd
let rendererWorkspaceCwd = testCwd
let rendererNestedCwd = testCwd

before(async () => {
  const configuration = await Configuration.find(testCwd, getPluginConfiguration())
  const { project } = await Project.find(configuration, testCwd)

  repoRoot = project.cwd
  rendererWorkspaceCwd = ppath.join(repoRoot, 'yarn/plugin-renderer')
  rendererNestedCwd = ppath.join(rendererWorkspaceCwd, 'sources/commands')
})

const createContext = (
  cwd: typeof repoRoot,
  environment: NodeJS.ProcessEnv = {},
  streams: Partial<Pick<CommandContext, 'stderr' | 'stdin' | 'stdout'>> = {}
): CommandContext => {
  const stderr = streams.stderr ?? new PassThrough()
  const stdout = streams.stdout ?? new PassThrough()

  if (!streams.stderr && stderr instanceof PassThrough) stderr.resume()
  if (!streams.stdout && stdout instanceof PassThrough) stdout.resume()

  return {
    colorDepth: 8,
    cwd,
    env: {
      ...process.env,
      ...environment,
    },
    plugins: getPluginConfiguration(),
    quiet: false,
    stderr,
    stdin: streams.stdin ?? new PassThrough(),
    stdout,
  }
}

const resolveEntryCommandInvocation = (context: CommandContext) =>
  resolveEntryInvocation(context, createProcessExecutor(context))

const resolveProjectCommandInvocation = async (context: CommandContext) =>
  resolveProjectInvocation(context, createProcessExecutor(context))

const resolveWorkspaceCommandInvocation = async (context: CommandContext) =>
  resolveWorkspaceInvocation(context, createProcessExecutor(context))

test('should bind entry command execution to the invocation cwd', async () => {
  const invocation: EntryInvocation = resolveEntryCommandInvocation(
    createContext(rendererNestedCwd)
  )
  const result = await invocation.process.execute(
    process.execPath,
    ['-e', 'process.stdout.write(process.cwd())'],
    { input: 'ignore', output: { mode: 'capture' } }
  )

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, rendererNestedCwd)
  assert.equal(result.stdout, npath.fromPortablePath(rendererNestedCwd))
})

test('should expose only entry-scoped process execution for entry commands', () => {
  const invocation = resolveEntryCommandInvocation(createContext(rendererNestedCwd))

  assert.equal('project' in invocation.process, false)
})

test('should resolve project command invocation from a nested cwd', async () => {
  const invocation = await resolveProjectCommandInvocation(createContext(rendererNestedCwd))

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, repoRoot)
  assert.equal(invocation.project.cwd, repoRoot)
  assert.equal(invocation.yarn.project.cwd, repoRoot)
})

test('should expose the existing managed Node executor with one IPC channel', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-command-node-'))
  const entry = join(cwd, 'entry.mjs')

  context.after(async () => rm(cwd, { force: true, recursive: true }))
  await writeFile(
    entry,
    "process.once('message', (message) => process.send({ received: message }, () => process.disconnect()))\n"
  )

  const invocation = await resolveProjectCommandInvocation(createContext(rendererNestedCwd))
  const result = await invocation.node.execute({
    channel: { input: { scenario: 'unit' } },
    cwd: npath.fromPortablePath(repoRoot),
    entry,
    input: 'ignore',
    output: { mode: 'capture' },
  })

  assert.equal(result.reason, 'completed')
  assert.deepEqual(result.messages, [{ received: { scenario: 'unit' } }])
})

test('should resolve workspace execution cwd without a duplicate workspace cwd field', async () => {
  const invocation = await resolveWorkspaceCommandInvocation(createContext(rendererNestedCwd))

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, rendererWorkspaceCwd)
  assert.equal(invocation.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
  assert.equal('workspaceCwd' in invocation, false)
})

test('should use a nested Yarn init cwd within the command cwd', async () => {
  const invocation = await resolveWorkspaceCommandInvocation(
    createContext(repoRoot, { INIT_CWD: npath.fromPortablePath(rendererNestedCwd) })
  )

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, rendererWorkspaceCwd)
})

test('should ignore a nested Yarn init cwd outside the command cwd', async () => {
  const invocation = await resolveWorkspaceCommandInvocation(
    createContext(rendererWorkspaceCwd, {
      INIT_CWD: npath.fromPortablePath(repoRoot),
    })
  )

  assert.equal(invocation.invocationCwd, rendererWorkspaceCwd)
  assert.equal(invocation.executionCwd, rendererWorkspaceCwd)
})

test('should bind command environment and output to process execution', async () => {
  const stdout = new PassThrough()
  const output: Array<Buffer> = []

  stdout.on('data', (data: Buffer) => output.push(data))

  const invocation = await resolveProjectCommandInvocation(
    createContext(repoRoot, { RAIJIN_INVOCATION_CONTEXT_TEST: 'bound' }, { stdout })
  )
  const result = await invocation.process.execute(
    process.execPath,
    ['-e', "process.stdout.write(process.env.RAIJIN_INVOCATION_CONTEXT_TEST ?? '')"],
    { input: 'ignore', output: { mode: 'capture', forward: true } }
  )

  assert.equal(result.reason, 'completed')
  assert.equal(result.exitCode, 0)

  assert.equal(Buffer.concat(output).toString(), 'bound')
})

test('should bind command environment to nested Yarn execution', async () => {
  const invocation = await resolveProjectCommandInvocation(
    createContext(repoRoot, { RAIJIN_INVOCATION_CONTEXT_TEST: 'nested' })
  )
  const result = await invocation.yarn.capture(
    [
      'exec',
      'node',
      '-e',
      "process.stdout.write(process.env.RAIJIN_INVOCATION_CONTEXT_TEST ?? '')",
    ],
    { input: 'ignore' }
  )

  assert.equal(result.reason, 'completed')
  assert.equal(result.exitCode, 0)

  assert.equal(result.stdout, 'nested')
})

test(
  'should execute nested Yarn through the Windows command shim',
  { skip: process.platform !== 'win32' },
  async () => {
    const invocation = await resolveProjectCommandInvocation(
      createContext(repoRoot, { RAIJIN_INVOCATION_CONTEXT_TEST: 'windows' })
    )
    const exitCode = await invocation.yarn.execute(
      [
        'exec',
        'node',
        '-e',
        "process.exit(process.env.RAIJIN_INVOCATION_CONTEXT_TEST === 'windows' ? 0 : 1)",
      ],
      { input: 'ignore' }
    )

    assert.equal(exitCode, 0)
  }
)

test('should root nested Yarn execution at the resolved project cwd', async () => {
  const invocation = await resolveProjectCommandInvocation(createContext(rendererNestedCwd))
  const result = await invocation.yarn.capture(
    [
      'exec',
      'node',
      '-e',
      'process.stdout.write(JSON.stringify({ cwd: process.cwd(), initCwd: process.env.INIT_CWD }))',
    ],
    { input: 'ignore' }
  )

  assert.deepEqual(JSON.parse(result.stdout), {
    cwd: npath.fromPortablePath(repoRoot),
    initCwd: npath.fromPortablePath(repoRoot),
  })
})

test('should root nested Yarn execution at the resolved workspace cwd', async () => {
  const invocation = await resolveWorkspaceCommandInvocation(createContext(rendererNestedCwd))
  const result = await invocation.yarn.capture(
    [
      'exec',
      'node',
      '-e',
      'process.stdout.write(JSON.stringify({ cwd: process.cwd(), initCwd: process.env.INIT_CWD }))',
    ],
    { input: 'ignore' }
  )

  assert.deepEqual(JSON.parse(result.stdout), {
    cwd: npath.fromPortablePath(rendererWorkspaceCwd),
    initCwd: npath.fromPortablePath(rendererWorkspaceCwd),
  })
})

test('should bind project-scoped process execution to the project cwd', async () => {
  const invocation = await resolveWorkspaceCommandInvocation(createContext(rendererNestedCwd))
  const result = await invocation.process.project.execute(
    process.execPath,
    ['-e', 'process.stdout.write(process.cwd())'],
    { input: 'ignore', output: { mode: 'capture' } }
  )

  assert.equal(result.stdout, npath.fromPortablePath(repoRoot))
})
