import type { Filename }             from '@yarnpkg/fslib'

import assert                        from 'node:assert/strict'
import { execFile }                  from 'node:child_process'
import { dirname }                   from 'node:path'
import { resolve }                   from 'node:path'
import test                          from 'node:test'
import { fileURLToPath }             from 'node:url'
import { pathToFileURL }             from 'node:url'

import { Configuration }             from '@yarnpkg/core'
import { Project }                   from '@yarnpkg/core'
import { getPluginConfiguration }    from '@yarnpkg/cli'
import { npath }                     from '@yarnpkg/fslib'
import { ppath }                     from '@yarnpkg/fslib'
import { xfs }                       from '@yarnpkg/fslib'

import { makeCurrentYarnExecutable } from './current-yarn-executable.js'
import { afterAllInstalled }         from './hooks/after-all-installed.hook.js'
import { setupScriptEnvironment }    from './hooks/setup-script-environment.hook.js'

const repoRoot = npath.toPortablePath(resolve(dirname(fileURLToPath(import.meta.url)), '../../..'))
const yarnExecutableNames: Array<Filename> =
  process.platform === 'win32'
    ? ['yarn.cmd' as Filename, 'yarnpkg.cmd' as Filename]
    : ['yarn' as Filename, 'yarnpkg' as Filename]

const execFileAsync = async (
  file: string,
  args: Array<string>,
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
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

test('should materialize current Yarn wrappers without Corepack reentry', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const binFolder = await xfs.mktempPromise()
  const { executable, env } = await makeCurrentYarnExecutable({ binFolder, project })

  const wrappers = await Promise.all(
    yarnExecutableNames.map(async (name) =>
      xfs.readFilePromise(ppath.join(binFolder, name), 'utf-8'))
  )

  for (const wrapper of wrappers) {
    assert.match(wrapper, /\.yarn[\\/]releases[\\/]yarn\.mjs/)
    assert.doesNotMatch(wrapper, /corepack/)
  }

  const { stdout } = await execFileAsync(executable, ['--version'], { env })

  assert.match(stdout, /-atls/)
})

test('should create script env for the selected workspace locator', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project, workspace } = await Project.find(
    configuration,
    ppath.join(repoRoot, 'yarn/plugin-renderer')
  )
  const binFolder = await xfs.mktempPromise()
  const { env } = await makeCurrentYarnExecutable({
    binFolder,
    locator: workspace?.anchoredLocator,
    project,
  })

  assert.equal(env.npm_package_name, '@atls/yarn-plugin-renderer')
  assert.match(env.npm_package_json ?? '', /yarn[\\/]plugin-renderer[\\/]package\.json/)
})

test('should materialize managed node wrapper for current Yarn executable', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const binFolder = await xfs.mktempPromise()
  const { env } = await makeCurrentYarnExecutable({
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
  const { env } = await makeCurrentYarnExecutable({
    binFolder,
    nodeLoader: 'file:///tmp/managed-loader.mjs',
    project,
  })
  const firstNodeOptions = env.NODE_OPTIONS

  await makeCurrentYarnExecutable({
    binFolder,
    env,
    nodeLoader: 'file:///tmp/managed-loader.mjs',
    project,
  })

  assert.equal(env.NODE_OPTIONS, firstNodeOptions)
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

test('should replace package script PnP loader with managed node loader', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const wrappers: Array<{ name: string; argv0: string; args: Array<string> }> = []
  const env = {
    NODE_OPTIONS: '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs',
    RAIJIN_NODE_LOADER: 'file:///tmp/managed-loader.mjs',
  }

  await setupScriptEnvironment(project, env, async (name, argv0, args = []) => {
    wrappers.push({ name, argv0, args })
  })

  const nodeWrapper = wrappers.find(({ name }) => name === 'node')

  assert.deepEqual(nodeWrapper, { name: 'node', argv0: process.execPath, args: [] })
  assert.match(env.NODE_OPTIONS, /^--require \.\/\.pnp\.cjs --import data:text\/javascript,/)
  assert.match(
    decodeURIComponent(env.NODE_OPTIONS),
    /register\("file:\/\/\/tmp\/managed-loader\.mjs"/
  )
})

test('should preserve unrelated package script node loaders', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const env = {
    NODE_OPTIONS:
      '--loader file:///tmp/custom-loader.mjs --experimental-loader file:///.pnp.loader.mjs',
    RAIJIN_NODE_LOADER: 'file:///tmp/managed-loader.mjs',
  }

  await setupScriptEnvironment(project, env, async () => undefined)

  assert.match(env.NODE_OPTIONS, /--loader file:\/\/\/tmp\/custom-loader\.mjs/)
  assert.doesNotMatch(env.NODE_OPTIONS, /\.pnp\.loader\.mjs/)
  assert.match(
    decodeURIComponent(env.NODE_OPTIONS),
    /register\("file:\/\/\/tmp\/managed-loader\.mjs"/
  )
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

  const { env } = await makeCurrentYarnExecutable({
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

test('should materialize Husky hooks as newline-terminated text files', async () => {
  const cwd = await xfs.mktempPromise()
  const hooksPath = ppath.join(cwd, '.config/husky')
  const previousGitHubActions = process.env.GITHUB_ACTIONS
  const previousImagePack = process.env.IMAGE_PACK

  await execFileAsync('git', ['init'], { cwd: npath.fromPortablePath(cwd) })

  delete process.env.GITHUB_ACTIONS
  delete process.env.IMAGE_PACK

  try {
    await afterAllInstalled({ cwd } as Project)
  } finally {
    if (previousGitHubActions === undefined) {
      delete process.env.GITHUB_ACTIONS
    } else {
      process.env.GITHUB_ACTIONS = previousGitHubActions
    }

    if (previousImagePack === undefined) {
      delete process.env.IMAGE_PACK
    } else {
      process.env.IMAGE_PACK = previousImagePack
    }
  }

  const hookNames: Array<Filename> = [
    'commit-msg' as Filename,
    'pre-commit' as Filename,
    'prepare-commit-msg' as Filename,
  ]
  const hooks = await Promise.all(
    hookNames.map(async (name) => xfs.readFilePromise(ppath.join(hooksPath, name), 'utf-8'))
  )
  const { stdout } = await execFileAsync('git', ['config', 'core.hooksPath'], {
    cwd: npath.fromPortablePath(cwd),
  })

  for (const hookContent of hooks) {
    assert.match(hookContent, /\n$/)
  }

  assert.equal(stdout.trim(), npath.fromPortablePath(hooksPath))
})
