import assert                                  from 'node:assert/strict'
import { mkdir }                               from 'node:fs/promises'
import { mkdtemp }                             from 'node:fs/promises'
import { rm }                                  from 'node:fs/promises'
import { writeFile }                           from 'node:fs/promises'
import { tmpdir }                              from 'node:os'
import { join }                                from 'node:path'
import { test }                                from 'node:test'

import { resolveProjectGenerationArtifactDir } from '../artifact.js'

test('should resolve a complete artifact from the current Raijin package boundary', async () => {
  const artifactDir = await mkdtemp(join(tmpdir(), 'raijin-project-artifact-'))

  try {
    await mkdir(join(artifactDir, 'project'))
    await writeFile(join(artifactDir, 'collection.json'), '{}\n')
    await writeFile(join(artifactDir, 'project/project.factory.cjs'), 'module.exports = {}\n')

    assert.equal(await resolveProjectGenerationArtifactDir(artifactDir), artifactDir)
  } finally {
    await rm(artifactDir, { recursive: true, force: true })
  }
})

test('should reject an incomplete current-version artifact', async () => {
  const artifactDir = await mkdtemp(join(tmpdir(), 'raijin-project-artifact-'))

  try {
    await writeFile(join(artifactDir, 'collection.json'), '{}\n')

    await assert.rejects(resolveProjectGenerationArtifactDir(artifactDir), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message.endsWith(`Checked path: ${artifactDir}`), true)

      return true
    })
  } finally {
    await rm(artifactDir, { recursive: true, force: true })
  }
})
