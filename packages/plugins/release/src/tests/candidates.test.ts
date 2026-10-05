import type { Project }            from '@yarnpkg/core'
import type { Workspace }          from '@yarnpkg/core'

import assert                      from 'node:assert/strict'
import { test }                    from 'node:test'

import { structUtils }             from '@yarnpkg/core'

import { selectReleaseCandidates } from '../candidates.js'

const workspace = (name: string, version: string | null, privatePackage = false): Workspace =>
  ({
    manifest: {
      name: structUtils.parseIdent(name),
      version,
      raw: { private: privatePackage },
    },
  }) as unknown as Workspace

test('includes a publishable root and excludes private, unversioned, and explicitly decided workspaces', () => {
  const root = workspace('@fixture/root', '1.0.0')
  const publicChild = workspace('@fixture/public', '1.0.0')
  const privateChild = workspace('@fixture/private', '1.0.0', true)
  const unversionedChild = workspace('@fixture/unversioned', null)
  const project = {
    topLevelWorkspace: root,
    workspaces: [root, publicChild, privateChild, unversionedChild],
  } as Project

  assert.deepEqual(selectReleaseCandidates(project, new Set()), [root, publicChild])
  assert.deepEqual(selectReleaseCandidates(project, new Set(['@fixture/root'])), [publicChild])
})
