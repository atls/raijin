import type { ProjectCommandContext } from '@atls/raijin/commands'

import assert                         from 'node:assert/strict'
import { execFile }                   from 'node:child_process'
import { mkdtemp }                    from 'node:fs/promises'
import { rm }                         from 'node:fs/promises'
import { writeFile }                  from 'node:fs/promises'
import { tmpdir }                     from 'node:os'
import { join }                       from 'node:path'
import { PassThrough }                from 'node:stream'
import test                           from 'node:test'
import { promisify }                  from 'node:util'

import { npath }                      from '@yarnpkg/fslib'

import { CommitMessageLintCommand }   from '../lint/command.js'

const execFilePromise = promisify(execFile)

const createCommand = (projectCwd: string, stdout: PassThrough): CommitMessageLintCommand => {
  const command = new CommitMessageLintCommand()
  const portableCwd = npath.toPortablePath(projectCwd)
  const manifest = { name: { name: 'service', scope: 'consumer' }, workspaceDefinitions: [] }

  command.context = {
    colorDepth: 8,
    cwd: npath.toPortablePath('/different-process-cwd'),
    env: {},
    invocation: {
      project: {
        cwd: portableCwd,
        topLevelWorkspace: { cwd: portableCwd, manifest },
        type: 'monorepo',
        workspacePatterns: ['packages/*'],
        workspaces: [{ cwd: portableCwd, manifest }],
      },
    },
    plugins: { modules: new Map(), plugins: new Set() },
    quiet: false,
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    stdout,
  } as unknown as ProjectCommandContext

  return command
}

test('should read and validate the edit message from the resolved project cwd', async () => {
  const projectCwd = await mkdtemp(join(tmpdir(), 'raijin-commit-lint-'))

  try {
    await execFilePromise('git', ['init', '--quiet'], { cwd: projectCwd })

    const editFile = join(projectCwd, '.git/COMMIT_EDITMSG')
    const stdout = new PassThrough()
    const output: Array<Buffer> = []

    stdout.on('data', (data: Buffer) => output.push(data))

    await writeFile(editFile, 'feat(service): use resolved project\n')

    assert.equal(await createCommand(projectCwd, stdout).execute(), 0)

    await writeFile(editFile, 'feat(unknown): reject unresolved scope\n')

    assert.equal(await createCommand(projectCwd, stdout).execute(), 1)
    assert.match(Buffer.concat(output).toString(), /scope must be one of/)
  } finally {
    await rm(projectCwd, { recursive: true })
  }
})

test('should propagate commitlint edit-file read failures', async () => {
  const projectCwd = await mkdtemp(join(tmpdir(), 'raijin-commit-lint-'))

  try {
    await execFilePromise('git', ['init', '--quiet'], { cwd: projectCwd })

    await assert.rejects(
      createCommand(projectCwd, new PassThrough()).execute(),
      /No commit message file found/
    )
  } finally {
    await rm(projectCwd, { recursive: true })
  }
})
