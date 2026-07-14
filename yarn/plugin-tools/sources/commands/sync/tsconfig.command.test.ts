import assert                     from 'node:assert/strict'
import test                       from 'node:test'

import { Manifest }               from '@yarnpkg/core'
import { npath }                  from '@yarnpkg/fslib'

import { createRaijinSyncTarget } from './target.js'

test('should keep tsconfig sync target at the project root workspace', () => {
  const projectRoot = npath.toPortablePath('/repo')
  const topLevelWorkspace = {
    cwd: projectRoot,
    manifest: Manifest.fromText(JSON.stringify({ workspaces: ['packages/*', 'apps/**/*'] })),
  }
  const target = createRaijinSyncTarget({
    topLevelWorkspace,
    workspaces: [topLevelWorkspace],
  } as never)

  assert.equal(target.cwd, projectRoot)
  assert.equal(target.workspace, topLevelWorkspace)
  assert.deepEqual(target.workspaces, ['packages/*', 'apps/**/*'])
})
