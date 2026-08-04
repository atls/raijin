import type { Project }                    from '@yarnpkg/core'

import type { InvocationExecutionContext } from '../../child-process.interfaces.js'

import assert                              from 'node:assert/strict'
import { PassThrough }                     from 'node:stream'
import test                                from 'node:test'

import { npath }                           from '@yarnpkg/fslib'

import { ensureProjectRuntime }            from '../runtime.js'

const projectCwd = npath.toPortablePath('/project')

const createProject = (nodeLinker: string): Project =>
  ({
    configuration: {
      get: (key: string) => (key === 'nodeLinker' ? nodeLinker : undefined),
    },
    cwd: projectCwd,
  }) as Project

const createContext = (environment: NodeJS.ProcessEnv = {}): InvocationExecutionContext => ({
  environment,
  stderr: new PassThrough(),
  stdin: new PassThrough(),
  stdout: new PassThrough(),
})

test('should reject unsupported node linkers before re-entry', async () => {
  let created = false
  let executed = false

  await assert.rejects(
    ensureProjectRuntime(createProject('node-modules'), createContext(), {
      argv: ['node', '/runtime/yarn.mjs'],
      createExecutable: async () => {
        created = true

        return { env: {}, executable: 'yarn' }
      },
      execute: async () => {
        executed = true

        return {
          exitCode: 0,
          stderr: '',
          stdout: '',
          termination: 'exit',
          timedOut: false,
        }
      },
    }),
    /require Yarn Plug'n'Play/
  )

  assert.equal(created, false)
  assert.equal(executed, false)
})

test('should treat the project marker as the complete runtime readiness contract', async () => {
  const exitCode = await ensureProjectRuntime(
    createProject('pnp'),
    createContext({
      NODE_OPTIONS: '--trace-warnings',
      RAIJIN_PROJECT_RUNTIME: '/project',
    }),
    {
      createExecutable: async () => {
        throw new Error('runtime environment must not be recreated')
      },
      execute: async () => {
        throw new Error('runtime must not be re-entered')
      },
    }
  )

  assert.equal(exitCode, undefined)
})

test('should re-enter once through the environment assembled by Yarn', async () => {
  let execution:
    | {
        args: Array<string>
        command: string
        environment: NodeJS.ProcessEnv
      }
    | undefined

  const exitCode = await ensureProjectRuntime(
    createProject('pnp'),
    createContext({ RAIJIN_TEST_ENV: 'inherited' }),
    {
      argv: ['node', '/runtime/yarn.mjs', 'test', 'unit'],
      createExecutable: async () => ({
        env: { NODE_OPTIONS: '--require /project/.pnp.cjs', RAIJIN_TEST_ENV: 'inherited' },
        executable: 'yarn',
      }),
      cwd: projectCwd,
      execPath: '/runtime/node',
      execute: async (command, args, options) => {
        execution = { args, command, environment: options.env }

        return {
          exitCode: 23,
          stderr: '',
          stdout: '',
          termination: 'exit',
          timedOut: false,
        }
      },
    }
  )

  assert.equal(exitCode, 23)
  assert.deepEqual(execution, {
    args: ['/runtime/yarn.mjs', 'test', 'unit'],
    command: '/runtime/node',
    environment: {
      NODE_OPTIONS: '--require /project/.pnp.cjs',
      RAIJIN_PROJECT_RUNTIME: '/project',
      RAIJIN_TEST_ENV: 'inherited',
    },
  })
})
