import type { CommandContext }               from '@yarnpkg/core'

import type { ProjectInvocation }            from './resolve.interfaces.js'
import type { CommandInvocationResolution }  from './resolve.interfaces.js'

import assert                                from 'node:assert/strict'
import { dirname }                           from 'node:path'
import { PassThrough }                       from 'node:stream'
import { before }                            from 'node:test'
import test                                  from 'node:test'
import { fileURLToPath }                     from 'node:url'

import { Configuration }                     from '@yarnpkg/core'
import { Project }                           from '@yarnpkg/core'
import { getPluginConfiguration }            from '@yarnpkg/cli'
import { npath }                             from '@yarnpkg/fslib'
import { ppath }                             from '@yarnpkg/fslib'

import { resolveProjectCommandInvocation }   from './resolve.js'
import { resolveWorkspaceCommandInvocation } from './resolve.js'

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
): CommandContext => ({
  colorDepth: 8,
  cwd,
  env: {
    ...process.env,
    ...environment,
    RAIJIN_PROJECT_RUNTIME: npath.fromPortablePath(repoRoot),
  },
  plugins: getPluginConfiguration(),
  quiet: false,
  stderr: streams.stderr ?? new PassThrough(),
  stdin: streams.stdin ?? new PassThrough(),
  stdout: streams.stdout ?? new PassThrough(),
})

const expectInvocation = <Invocation extends ProjectInvocation>(
  resolution: CommandInvocationResolution<Invocation>
): Invocation => {
  assert.equal('exitCode' in resolution, false)

  return resolution as Invocation
}

test('should resolve project command invocation from a nested cwd', async () => {
  const invocation = expectInvocation(
    await resolveProjectCommandInvocation(createContext(rendererNestedCwd))
  )

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, repoRoot)
  assert.equal(invocation.project.cwd, repoRoot)
  assert.equal(invocation.yarn.project.cwd, repoRoot)
})

test('should resolve workspace execution cwd without a duplicate workspace cwd field', async () => {
  const invocation = expectInvocation(
    await resolveWorkspaceCommandInvocation(createContext(rendererNestedCwd))
  )

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, rendererWorkspaceCwd)
  assert.equal(invocation.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
  assert.equal('workspaceCwd' in invocation, false)
})

test('should use a nested Yarn init cwd within the command cwd', async () => {
  const invocation = expectInvocation(
    await resolveWorkspaceCommandInvocation(
      createContext(repoRoot, { INIT_CWD: npath.fromPortablePath(rendererNestedCwd) })
    )
  )

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, rendererWorkspaceCwd)
})

test('should ignore a nested Yarn init cwd outside the command cwd', async () => {
  const invocation = expectInvocation(
    await resolveWorkspaceCommandInvocation(
      createContext(rendererWorkspaceCwd, {
        INIT_CWD: npath.fromPortablePath(repoRoot),
      })
    )
  )

  assert.equal(invocation.invocationCwd, rendererWorkspaceCwd)
  assert.equal(invocation.executionCwd, rendererWorkspaceCwd)
})

test('should bind command environment and output to child execution', async () => {
  const stdout = new PassThrough()
  const output: Array<Buffer> = []

  stdout.on('data', (data: Buffer) => output.push(data))

  const invocation = expectInvocation(
    await resolveProjectCommandInvocation(
      createContext(repoRoot, { RAIJIN_INVOCATION_CONTEXT_TEST: 'bound' }, { stdout })
    )
  )
  const result = await invocation.child.execute(process.execPath, [
    '-e',
    "process.stdout.write(process.env.RAIJIN_INVOCATION_CONTEXT_TEST ?? '')",
  ])

  assert.equal(result.exitCode, 0)
  assert.equal(Buffer.concat(output).toString(), 'bound')
})

test('should bind command environment to nested Yarn execution', async () => {
  const invocation = expectInvocation(
    await resolveProjectCommandInvocation(
      createContext(repoRoot, { RAIJIN_INVOCATION_CONTEXT_TEST: 'nested' })
    )
  )
  const result = await invocation.yarn.capture([
    'exec',
    'node',
    '-e',
    "process.stdout.write(process.env.RAIJIN_INVOCATION_CONTEXT_TEST ?? '')",
  ])

  assert.equal(result.exitCode, 0)
  assert.equal(result.stdout, 'nested')
})
