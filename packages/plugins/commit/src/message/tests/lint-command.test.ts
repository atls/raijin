import type { CommitMessageProject } from '../policy.js'

import assert                        from 'node:assert/strict'
import { execFile }                  from 'node:child_process'
import { mkdtemp }                   from 'node:fs/promises'
import { rm }                        from 'node:fs/promises'
import { writeFile }                 from 'node:fs/promises'
import { tmpdir }                    from 'node:os'
import { join }                      from 'node:path'
import test                          from 'node:test'
import { promisify }                 from 'node:util'

import { npath }                     from '@yarnpkg/fslib'

import { lintCommitMessage }         from '../lint/command.js'

const execFilePromise = promisify(execFile)

const createProject = (projectCwd: string): CommitMessageProject => {
  const portableCwd = npath.toPortablePath(projectCwd)
  const manifest = { name: { name: 'service', scope: 'consumer' }, workspaceDefinitions: [] }

  return {
    cwd: portableCwd,
    workspaces: [{ manifest }],
  }
}

test('should read and validate the edit message from the resolved project cwd', async () => {
  const projectCwd = await mkdtemp(join(tmpdir(), 'raijin-commit-lint-'))

  try {
    await execFilePromise('git', ['init', '--quiet'], { cwd: projectCwd })

    const editFile = join(projectCwd, '.git/COMMIT_EDITMSG')
    const output: Array<string> = []
    const project = createProject(projectCwd)

    await writeFile(editFile, 'feat(service): use resolved project\n')

    assert.equal(
      await lintCommitMessage({ project, writeOutput: (value) => output.push(value) }),
      0
    )

    await writeFile(editFile, 'feat(unknown): reject unresolved scope\n')

    assert.equal(
      await lintCommitMessage({ project, writeOutput: (value) => output.push(value) }),
      1
    )
    assert.match(output.join(''), /scope must be one of/)
  } finally {
    await rm(projectCwd, { recursive: true })
  }
})

test('should propagate commitlint edit-file read failures', async () => {
  const projectCwd = await mkdtemp(join(tmpdir(), 'raijin-commit-lint-'))

  try {
    await execFilePromise('git', ['init', '--quiet'], { cwd: projectCwd })

    await assert.rejects(
      lintCommitMessage({ project: createProject(projectCwd), writeOutput: () => undefined }),
      /No commit message file found/
    )
  } finally {
    await rm(projectCwd, { recursive: true })
  }
})
