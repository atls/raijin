import assert                              from 'node:assert/strict'
import { test }                            from 'node:test'

import { ppath }                           from '@yarnpkg/fslib'
import { xfs }                             from '@yarnpkg/fslib'

import { assertProjectGenerationArtifact } from '../contract.js'
import { resolveProjectCollectionPath }    from '../contract.js'

test('should accept a complete project generation artifact', async () => {
  await xfs.mktempPromise(async (artifactDir) => {
    await xfs.mkdirPromise(ppath.join(artifactDir, 'project'))
    await xfs.writeFilePromise(ppath.join(artifactDir, 'collection.json'), '{}\n')
    await xfs.writeFilePromise(
      ppath.join(artifactDir, 'project/project.factory.cjs'),
      'module.exports = {}\n'
    )

    await assert.doesNotReject(assertProjectGenerationArtifact(artifactDir))
    assert.equal(
      resolveProjectCollectionPath(artifactDir),
      ppath.join(artifactDir, 'collection.json')
    )
  })
})

test('should reject an incomplete project generation artifact', async () => {
  await xfs.mktempPromise(async (artifactDir) => {
    await xfs.writeFilePromise(ppath.join(artifactDir, 'collection.json'), '{}\n')

    await assert.rejects(assertProjectGenerationArtifact(artifactDir), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message.endsWith(`Checked path: ${artifactDir}`), true)

      return true
    })
  })
})
