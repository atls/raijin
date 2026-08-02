import assert                     from 'node:assert/strict'
import { dirname }                from 'node:path'
import { resolve }                from 'node:path'
import test                       from 'node:test'
import { fileURLToPath }          from 'node:url'

import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { getPluginConfiguration } from '@yarnpkg/cli'
import { npath }                  from '@yarnpkg/fslib'

import { setupScriptEnvironment } from './setup-script-environment.hook.js'

const repoRoot = npath.toPortablePath(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
)
const noopPathWrapper = async (): Promise<void> => undefined

test('should add the managed node loader beside the package script PnP loader', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const env = {
    NODE_OPTIONS: '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs',
    RAIJIN_NODE_LOADER: 'file:///tmp/managed-loader.mjs',
  }

  await setupScriptEnvironment(project, env, noopPathWrapper)

  assert.match(
    env.NODE_OPTIONS,
    /^--require \.\/\.pnp\.cjs --experimental-loader file:\/\/\/\.pnp\.loader\.mjs --import data:text\/javascript,/
  )
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

  await setupScriptEnvironment(project, env, noopPathWrapper)

  assert.match(env.NODE_OPTIONS, /--loader file:\/\/\/tmp\/custom-loader\.mjs/)
  assert.match(env.NODE_OPTIONS, /--experimental-loader file:\/\/\/\.pnp\.loader\.mjs/)
  assert.match(
    decodeURIComponent(env.NODE_OPTIONS),
    /register\("file:\/\/\/tmp\/managed-loader\.mjs"/
  )
})

test('should route package script Yarn wrappers through the selected runtime', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const wrappers: Array<{ name: string; argv0: string; args: Array<string> }> = []

  await setupScriptEnvironment(project, {}, async (name, argv0, args) => {
    wrappers.push({ name, argv0, args })
  })

  assert.deepEqual(wrappers, [
    { name: 'run', argv0: process.execPath, args: [process.argv[1], 'run'] },
    { name: 'yarn', argv0: process.execPath, args: [process.argv[1]] },
    { name: 'yarnpkg', argv0: process.execPath, args: [process.argv[1]] },
    {
      name: 'node-gyp',
      argv0: process.execPath,
      args: [process.argv[1], 'run', '--top-level', 'node-gyp'],
    },
  ])
})
