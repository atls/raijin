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

test('should replace package script PnP loader with managed node loader', async () => {
  const configuration = await Configuration.find(repoRoot, getPluginConfiguration())
  const { project } = await Project.find(configuration, repoRoot)
  const env = {
    NODE_OPTIONS: '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs',
    RAIJIN_NODE_LOADER: 'file:///tmp/managed-loader.mjs',
  }

  await setupScriptEnvironment(project, env)

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

  await setupScriptEnvironment(project, env)

  assert.match(env.NODE_OPTIONS, /--loader file:\/\/\/tmp\/custom-loader\.mjs/)
  assert.doesNotMatch(env.NODE_OPTIONS, /\.pnp\.loader\.mjs/)
  assert.match(
    decodeURIComponent(env.NODE_OPTIONS),
    /register\("file:\/\/\/tmp\/managed-loader\.mjs"/
  )
})
