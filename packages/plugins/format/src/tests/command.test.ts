import type { WorkspaceInvocation } from '@atls/raijin/commands'
import type { Workspace }           from '@yarnpkg/core'
import type { Writable }            from 'node:stream'

import assert                       from 'node:assert/strict'
import { mkdtemp }                  from 'node:fs/promises'
import { mkdir }                    from 'node:fs/promises'
import { readFile }                 from 'node:fs/promises'
import { writeFile }                from 'node:fs/promises'
import { tmpdir }                   from 'node:os'
import { join }                     from 'node:path'
import { test }                     from 'node:test'

import { toPortableCwd }            from '@atls/raijin/commands'

import { FormatCommand }            from '../command.jsx'

const createOutput = (): { output: Writable; read: () => string } => {
  let value = ''

  return {
    output: {
      write: (chunk: unknown) => {
        value += String(chunk)

        return true
      },
    } as Writable,
    read: () => value,
  }
}

const runCommand = async (
  cwd: string,
  files: Array<string>
): Promise<{ exitCode: number; stderr: string; stdout: string }> => {
  const stderr = createOutput()
  const stdout = createOutput()
  const invocation = {
    executionCwd: toPortableCwd(cwd),
    invocationCwd: toPortableCwd(cwd),
    yarn: { project: { workspaces: [] as Array<Workspace> } },
  } as unknown as WorkspaceInvocation
  const command = Object.assign(Object.create(FormatCommand.prototype), {
    context: { invocation, stderr: stderr.output, stdout: stdout.output },
    files,
  }) as FormatCommand

  return { exitCode: await command.execute(), stderr: stderr.read(), stdout: stdout.read() }
}

test('should format explicit targets and return success', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-format-command-'))
  const sourceDirectory = join(cwd, 'src')
  const sourceFile = join(sourceDirectory, 'index.ts')

  await mkdir(sourceDirectory)
  await writeFile(join(cwd, 'package.json'), '{"private":true}\n')
  await writeFile(sourceFile, 'const value={foo:1}\n')

  assert.deepEqual(await runCommand(cwd, ['src/index.ts']), {
    exitCode: 0,
    stderr: '',
    stdout: '',
  })
  assert.equal(await readFile(sourceFile, 'utf8'), 'const value = { foo: 1 }\n')
})

test('should report missing targets and return failure', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-format-command-'))

  await writeFile(join(cwd, 'package.json'), '{"private":true}\n')

  const result = await runCommand(cwd, ['missing.ts'])

  assert.equal(result.exitCode, 1)
  assert.equal(result.stderr, '')
  assert.match(result.stdout, /Formatter target does not exist: missing\.ts/)
})
