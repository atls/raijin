import type { Filename }          from '@yarnpkg/fslib'

import assert                     from 'node:assert/strict'
import { execFile }               from 'node:child_process'
import { dirname }                from 'node:path'
import test                       from 'node:test'
import { fileURLToPath }          from 'node:url'
import { pathToFileURL }          from 'node:url'

import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { getPluginConfiguration } from '@yarnpkg/cli'
import { npath }                  from '@yarnpkg/fslib'
import { ppath }                  from '@yarnpkg/fslib'
import { xfs }                    from '@yarnpkg/fslib'

import { createYarnExecutable }   from './execution.js'

const testCwd = npath.toPortablePath(dirname(fileURLToPath(import.meta.url)))

const resolveTestProject = async () => {
  const configuration = await Configuration.find(testCwd, getPluginConfiguration())

  return Project.find(configuration, testCwd)
}
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
  const { project } = await resolveTestProject()
  const binFolder = await xfs.mktempPromise()
  const { executable, env } = await createYarnExecutable({ binFolder, project })

  assert.equal(executable, process.platform === 'win32' ? 'yarn.cmd' : 'yarn')

  const { stdout } = await execFileAsync(executable, ['--version'], {
    cwd: npath.fromPortablePath(project.cwd),
    env,
    shell: process.platform === 'win32',
  })

  assert.match(stdout, /-atls/)
})

test('should create script env for the selected workspace locator', async () => {
  const { project } = await resolveTestProject()
  const workspace = project.getWorkspaceByCwd(ppath.join(project.cwd, 'yarn/plugin-renderer'))
  const binFolder = await xfs.mktempPromise()
  const { env } = await createYarnExecutable({
    binFolder,
    locator: workspace.anchoredLocator,
    project,
  })

  assert.equal(env.npm_package_name, '@atls/yarn-plugin-renderer')
  assert.match(env.npm_package_json ?? '', /yarn[\\/]plugin-renderer[\\/]package\.json/)
})

test('should preserve Yarn PnP options when adding command node options', async () => {
  const { project } = await resolveTestProject()
  const binFolder = await xfs.mktempPromise()
  const { env } = await createYarnExecutable({
    binFolder,
    env: { NODE_OPTIONS: '--no-warnings=DeprecationWarning' },
    project,
  })

  assert.match(env.NODE_OPTIONS ?? '', /\.pnp\.cjs/)
  assert.match(env.NODE_OPTIONS ?? '', /\.pnp\.loader\.mjs/)
  assert.match(env.NODE_OPTIONS ?? '', /--no-warnings=DeprecationWarning/)
})

test('should rebuild the selected project environment after launcher cleanup', async () => {
  const { project } = await resolveTestProject()
  const binFolder = await xfs.mktempPromise()
  const nativeBinFolder = npath.fromPortablePath(binFolder)
  const launcherBinFolder = npath.join(npath.fromPortablePath(project.cwd), 'xfs-launcher')
  const launcherPnpPath = npath.join(launcherBinFolder, '.pnp.cjs')
  const launcherPnpLoaderPath = pathToFileURL(npath.join(launcherBinFolder, '.pnp.loader.mjs')).href
  const { env } = await createYarnExecutable({
    binFolder,
    env: {
      BERRY_BIN_FOLDER: launcherBinFolder,
      NODE_OPTIONS: `--require ${launcherPnpPath} --experimental-loader ${launcherPnpLoaderPath} --trace-warnings`,
      PATH: [launcherBinFolder, project.configuration.env.PATH]
        .filter(Boolean)
        .join(npath.delimiter),
      npm_execpath: npath.join(launcherBinFolder, 'yarn'),
    },
    project,
  })

  assert.equal(env.BERRY_BIN_FOLDER, nativeBinFolder)
  assert.equal(env.PATH?.split(npath.delimiter)[0], nativeBinFolder)
  assert.doesNotMatch(env.PATH, /xfs-launcher/)
  assert.equal(env.npm_execpath, npath.join(nativeBinFolder, 'yarn'))
  assert.match(env.NODE_OPTIONS ?? '', /\.pnp\.cjs/)
  assert.match(env.NODE_OPTIONS ?? '', /\.pnp\.loader\.mjs/)
  assert.doesNotMatch(env.NODE_OPTIONS ?? '', /xfs-launcher/)
  assert.match(env.NODE_OPTIONS ?? '', /--trace-warnings/)
})

test('should use the node wrapper materialized by Yarn', async () => {
  const { project } = await resolveTestProject()
  const binFolder = await xfs.mktempPromise()
  const { env } = await createYarnExecutable({
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
  const { project } = await resolveTestProject()
  const binFolder = await xfs.mktempPromise()
  const { env } = await createYarnExecutable({
    binFolder,
    nodeLoader: 'file:///tmp/managed-loader.mjs',
    project,
  })
  const { env: secondEnv } = await createYarnExecutable({
    binFolder,
    env,
    nodeLoader: 'file:///tmp/managed-loader.mjs',
    project,
  })

  assert.equal(secondEnv.NODE_OPTIONS?.match(/--import data:text\/javascript,/g)?.length, 1)
})

test('should forward node flags from managed node wrapper', async () => {
  const { project } = await resolveTestProject()
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

  const { env } = await createYarnExecutable({
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
