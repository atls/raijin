import assert                     from 'node:assert/strict'
import test                       from 'node:test'

import { Manifest }               from '@yarnpkg/core'
import { structUtils }            from '@yarnpkg/core'

import { syncTypeScriptManifest } from '@atls/raijin/config/sync'

import { createRaijinSyncTarget } from './target.js'

const getTypeScriptRange = (manifest: Manifest): string =>
  manifest.devDependencies.get(structUtils.parseIdent('typescript').identHash)?.range ?? ''

test('should sync TypeScript through the project root workspace target', () => {
  const rootManifest = Manifest.fromText(JSON.stringify({ devDependencies: { typescript: '^5' } }))
  const leafManifest = Manifest.fromText(
    JSON.stringify({ devDependencies: { typescript: '5.8.0' } })
  )
  const rootWorkspace = { cwd: '/repo', manifest: rootManifest }
  const leafWorkspace = { cwd: '/repo/packages/client', manifest: leafManifest }
  const target = createRaijinSyncTarget({
    topLevelWorkspace: rootWorkspace,
    workspaces: [rootWorkspace, leafWorkspace],
  } as never)

  assert.equal(syncTypeScriptManifest(target.workspace.manifest, '5.9.3'), true)
  assert.equal(getTypeScriptRange(rootManifest), '5.9.3')
  assert.equal(getTypeScriptRange(leafManifest), '5.8.0')
})
