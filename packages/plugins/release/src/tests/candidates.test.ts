import type { Project }            from '@yarnpkg/core'
import type { Workspace }          from '@yarnpkg/core'

import assert                      from 'node:assert/strict'
import { test }                    from 'node:test'

import { structUtils }             from '@yarnpkg/core'
import { npath }                   from '@yarnpkg/fslib'

import { selectReleaseCandidates } from '../candidates.js'

const workspace = (
  name: string,
  version: string | null,
  privatePackage = false,
  relativeCwd = '.'
): Workspace =>
  ({
    manifest: {
      name: structUtils.parseIdent(name),
      version,
      raw: { private: privatePackage },
    },
    relativeCwd: npath.toPortablePath(relativeCwd),
  }) as unknown as Workspace

test('supports public leaves and a single public root, but requires an explicit decision for a public parent', () => {
  const root = workspace('@fixture/root', '1.0.0')
  const publicChild = workspace('@fixture/public', '1.0.0', false, 'packages/public')
  const privateChild = workspace('@fixture/private', '1.0.0', true, 'packages/private')
  const unversionedChild = workspace('@fixture/unversioned', null, false, 'packages/unversioned')
  const project = {
    topLevelWorkspace: root,
    workspaces: [root, publicChild, privateChild, unversionedChild],
  } as Project

  assert.throws(
    () => selectReleaseCandidates(project, new Set()),
    /record an explicit Yarn version decision/
  )
  assert.deepEqual(selectReleaseCandidates(project, new Set(['@fixture/root'])), [publicChild])
  assert.deepEqual(
    selectReleaseCandidates({ ...project, workspaces: [root] } as Project, new Set()),
    [root]
  )
})
