import type { Filename }             from '@yarnpkg/fslib'

import assert                        from 'node:assert/strict'
import { execFile }                  from 'node:child_process'
import { dirname }                   from 'node:path'
import { resolve }                   from 'node:path'
import test                          from 'node:test'
import { fileURLToPath }             from 'node:url'

import { Configuration }             from '@yarnpkg/core'
import { Project }                   from '@yarnpkg/core'
import { getPluginConfiguration }    from '@yarnpkg/cli'
import { npath }                     from '@yarnpkg/fslib'
import { ppath }                     from '@yarnpkg/fslib'
import { xfs }                       from '@yarnpkg/fslib'

import { makeCurrentYarnExecutable } from './current-yarn-executable.js'
import { setupScriptEnvironment }    from './hooks/setup-script-environment.hook.js'

const repoRoot = npath.toPortablePath(resolve(dirname(fileURLToPath(import.meta.url)), '../../..'))
const yarnExecutableNames: Array<Filename> =
  process.platform === 'win32'
    ? ['yarn.cmd' as Filename, 'yarnpkg.cmd' as Filename]
    : ['yarn' as Filename, 'yarnpkg' as Filename]

const execFileAsync = async (
  file: string,
  args: Array<string>,
  options: { env: NodeJS.ProcessEnv }
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolvePromise, rejectPromise) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        rejectPromise(error)

        return
      }

      resolvePromise({ stdout, stderr })
    })
  })

test('should materialize current Yarn shims without Corepack reentry', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const binFolder = await xfs.mktempPromise()
  const { executable, env } = await makeCurrentYarnExecutable({ binFolder, project })

  const shims = await Promise.all(
    yarnExecutableNames.map(async (name) =>
      xfs.readFilePromise(ppath.join(binFolder, name), 'utf-8'))
  )

  for (const shim of shims) {
    assert.match(shim, /\.yarn[\\/]releases[\\/]yarn\.mjs/)
    assert.doesNotMatch(shim, /corepack/)
  }

  const { stdout } = await execFileAsync(executable, ['--version'], { env })

  assert.match(stdout, /-atls/)
})

test('should setup package script Yarn wrappers without Corepack reentry', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const wrappers: Array<{ name: string; argv0: string; args: Array<string> }> = []

  await setupScriptEnvironment(project, {}, async (name, argv0, args = []) => {
    wrappers.push({ name, argv0, args })
  })

  assert.deepEqual(
    wrappers.map(({ name }) => name),
    ['run', 'yarn', 'yarnpkg', 'node-gyp']
  )

  for (const wrapper of wrappers) {
    assert.equal(wrapper.argv0, process.execPath)
    assert.match(wrapper.args.join(' '), /\.yarn[\\/]releases[\\/]yarn\.mjs/)
    assert.doesNotMatch(wrapper.args.join(' '), /corepack/)
  }
})
