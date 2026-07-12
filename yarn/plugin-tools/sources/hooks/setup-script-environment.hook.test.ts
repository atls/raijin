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

test('should route package script Yarn wrappers through Corepack', async () => {
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
    assert.equal(wrapper.argv0, process.platform === 'win32' ? 'corepack.cmd' : 'corepack')
    assert.equal(wrapper.args[0], 'yarn')
    assert.doesNotMatch(wrapper.args.join(' '), /\.yarn[\\/]releases[\\/]yarn\.mjs/)
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
