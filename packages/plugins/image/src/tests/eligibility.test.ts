import assert               from 'node:assert/strict'
import { test }             from 'node:test'

import { Manifest }         from '@yarnpkg/core'
import { structUtils }      from '@yarnpkg/core'

import { isImageWorkspace } from '../eligibility.js'

test('should accept a named application with start without inspecting its build command', () => {
  const manifest = new Manifest()

  manifest.name = structUtils.parseIdent('@example/app')
  manifest.scripts.set('start', 'node server.js')
  manifest.scripts.set('build', 'custom-application-build')
  assert.equal(isImageWorkspace(manifest), true)
  manifest.scripts.delete('build')
  assert.equal(isImageWorkspace(manifest), true)
})

test('should reject unnamed workspaces and missing or empty production start', () => {
  const manifest = new Manifest()

  manifest.scripts.set('start', 'node server.js')
  assert.equal(isImageWorkspace(manifest), false)
  manifest.name = structUtils.parseIdent('@example/app')
  manifest.scripts.delete('start')
  manifest.scripts.set('start-image', 'node server.js')
  assert.equal(isImageWorkspace(manifest), false)
  manifest.scripts.set('start', ' ')
  assert.equal(isImageWorkspace(manifest), false)
})
