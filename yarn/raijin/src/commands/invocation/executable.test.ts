import type { Filename }               from '@yarnpkg/fslib'

import assert                          from 'node:assert/strict'
import { execFile }                    from 'node:child_process'
import { dirname }                     from 'node:path'
import { resolve }                     from 'node:path'
import test                            from 'node:test'
import { fileURLToPath }               from 'node:url'
import { pathToFileURL }               from 'node:url'

import { Configuration }               from '@yarnpkg/core'
import { Project }                     from '@yarnpkg/core'
import { getPluginConfiguration }      from '@yarnpkg/cli'
import { npath }                       from '@yarnpkg/fslib'
import { ppath }                       from '@yarnpkg/fslib'
import { xfs }                         from '@yarnpkg/fslib'

import { createYarnCommandExecutable } from './executable.js'

const repoRoot = npath.toPortablePath(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
)
const execFileAsync = async (
  file: string,
  args: Array<string>,
  options: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean } = {}
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolvePromise, rejectPromise) => {
    execFile(file, args, { ...options, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        rejectPromise(error)

        return
      }

      resolvePromise({ stdout, stderr })
    })
  })

test('should use the Corepack-managed Yarn executable', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const binFolder = await xfs.mktempPromise()
  const { executable, env } = await createYarnCommandExecutable({ binFolder, project })

  assert.equal(executable, process.platform === 'win32' ? 'yarn.cmd' : 'yarn')

  const { stdout } = await execFileAsync(executable, ['--version'], {
    cwd: npath.fromPortablePath(repoRoot),
    env,
    shell: process.platform === 'win32',
  })

  assert.match(stdout, /-atls/)
})

test('should create script env for the selected workspace locator', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project, workspace } = await Project.find(
    configuration,
    ppath.join(repoRoot, 'yarn/plugin-renderer')
  )
  const binFolder = await xfs.mktempPromise()
  const { env } = await createYarnCommandExecutable({
    binFolder,
    locator: workspace?.anchoredLocator,
    project,
  })

  assert.equal(env.npm_package_name, '@atls/yarn-plugin-renderer')
  assert.match(env.npm_package_json ?? '', /yarn[\\/]plugin-renderer[\\/]package\.json/)
})

test('should preserve Yarn PnP options when adding command node options', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const binFolder = await xfs.mktempPromise()
  const { env } = await createYarnCommandExecutable({
    binFolder,
    env: { NODE_OPTIONS: '--no-warnings=DeprecationWarning' },
    project,
  })

  assert.match(env.NODE_OPTIONS ?? '', /\.pnp\.cjs/)
  assert.match(env.NODE_OPTIONS ?? '', /\.pnp\.loader\.mjs/)
  assert.match(env.NODE_OPTIONS ?? '', /--no-warnings=DeprecationWarning/)
})

test('should materialize managed node wrapper for current Yarn executable', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const binFolder = await xfs.mktempPromise()
  const { env } = await createYarnCommandExecutable({
    binFolder,
    nodeLoader: 'file:///tmp/managed-loader.mjs',
    project,
  })
  const nodeWrapper = await xfs.readFilePromise(ppath.join(binFolder, 'node' as Filename), 'utf-8')

  assert.equal(env.RAIJIN_NODE_LOADER, 'file:///tmp/managed-loader.mjs')
  assert.match(env.NODE_OPTIONS ?? '', /--import data:text\/javascript,/)
  assert.match(
    decodeURIComponent(env.NODE_OPTIONS ?? ''),
    /register\("file:\/\/\/tmp\/managed-loader\.mjs"/
  )
  assert.doesNotMatch(nodeWrapper, / -e /)
  assert.doesNotMatch(nodeWrapper, /RAIJIN_NODE_LOADER/)
})

test('should keep managed node loader options idempotent', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const binFolder = await xfs.mktempPromise()
  const { env } = await createYarnCommandExecutable({
    binFolder,
    nodeLoader: 'file:///tmp/managed-loader.mjs',
    project,
  })
  const firstNodeOptions = env.NODE_OPTIONS

  await createYarnCommandExecutable({
    binFolder,
    env,
    nodeLoader: 'file:///tmp/managed-loader.mjs',
    project,
  })

  assert.equal(env.NODE_OPTIONS, firstNodeOptions)
})

test('should forward node flags from managed node wrapper', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const binFolder = await xfs.mktempPromise()
  const loaderPath = ppath.join(binFolder, 'managed-loader.mjs' as Filename)

  await xfs.writeFilePromise(
    loaderPath,
    [
      'export async function resolve(specifier, context, nextResolve) {',
      '  return nextResolve(specifier, context)',
      '}',
      'export async function load(url, context, nextLoad) {',
      '  return nextLoad(url, context)',
      '}',
    ].join('\n')
  )

  const { env } = await createYarnCommandExecutable({
    binFolder,
    nodeLoader: pathToFileURL(npath.fromPortablePath(loaderPath)).href,
    project,
  })
  const nodeWrapper = npath.fromPortablePath(ppath.join(binFolder, 'node' as Filename))
  const { stdout } = await execFileAsync(
    nodeWrapper,
    [
      '--conditions=raijin-managed-wrapper-test',
      '-e',
      'process.stdout.write(JSON.stringify(process.execArgv))',
    ],
    { env }
  )
  const execArgv = JSON.parse(stdout) as Array<string>

  assert.ok(execArgv.includes('--conditions=raijin-managed-wrapper-test'))
})
