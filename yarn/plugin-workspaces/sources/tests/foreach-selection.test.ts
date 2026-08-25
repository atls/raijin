import assert             from 'node:assert/strict'
import { execFile }       from 'node:child_process'
import { dirname }        from 'node:path'
import { join }           from 'node:path'
import { resolve }        from 'node:path'
import { test }           from 'node:test'
import { fileURLToPath }  from 'node:url'

const execFileAsync = async (
  file: string,
  args: Array<string>,
  options: { cwd: string }
): Promise<{ stdout: string }> =>
  new Promise((resolvePromise, rejectPromise) => {
    execFile(file, args, { ...options, encoding: 'utf8' }, (error, stdout) => {
      if (error) {
        rejectPromise(error)

        return
      }

      resolvePromise({ stdout })
    })
  })

test('selects project-relative workspace paths through the real Yarn foreach', async () => {
  const projectCwd = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
  const yarnPath = join(projectCwd, '.yarn/releases/yarn.mjs')
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      yarnPath,
      'workspaces',
      'foreach',
      '--include',
      '.',
      '--include',
      'yarn/plugin-files',
      '--all',
      'exec',
      process.execPath,
      '-e',
      'process.stdout.write(process.cwd() + "\\n")',
    ],
    { cwd: projectCwd }
  )
  const selectedCwds = stdout
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.startsWith(projectCwd))
    .sort()

  assert.deepEqual(selectedCwds, [projectCwd, join(projectCwd, 'yarn/plugin-files')].sort())
})
