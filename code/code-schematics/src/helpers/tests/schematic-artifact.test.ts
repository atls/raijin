import assert                         from 'node:assert/strict'
import { access }                     from 'node:fs/promises'
import { mkdir }                      from 'node:fs/promises'
import { mkdtemp }                    from 'node:fs/promises'
import { rm }                         from 'node:fs/promises'
import { writeFile }                  from 'node:fs/promises'
import { tmpdir }                     from 'node:os'
import { dirname }                    from 'node:path'
import { join }                       from 'node:path'
import { test }                       from 'node:test'

import { SchematicArtifactException } from '../../exceptions/index.js'
import { writeSchematicArtifact }     from '../schematic-artifact.js'

const packageRoot = join(import.meta.dirname, '../../..')
const artifactDir = join(packageRoot, 'dist/schematic')

const resetArtifact = async (): Promise<void> => {
  await rm(artifactDir, { recursive: true, force: true })
}

const writeArtifactFile = async (relativePath: string, content = '{}'): Promise<void> => {
  const path = join(artifactDir, relativePath)

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

test('should write schematic files from package artifact', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'schematic-artifact-'))

  try {
    await resetArtifact()
    await writeArtifactFile('collection.json')
    await writeArtifactFile('project/project.factory.cjs', 'module.exports = {}\n')

    await writeSchematicArtifact(tmpDir)

    await assert.doesNotReject(access(join(tmpDir, 'collection.json')))
    await assert.doesNotReject(access(join(tmpDir, 'project/project.factory.cjs')))
  } finally {
    await resetArtifact()
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('should reject missing schematic artifact', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'missing-schematic-artifact-'))

  try {
    await resetArtifact()

    await assert.rejects(writeSchematicArtifact(tmpDir), SchematicArtifactException)
  } finally {
    await resetArtifact()
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('should reject incomplete schematic artifact', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'incomplete-schematic-artifact-'))

  try {
    await resetArtifact()
    await writeArtifactFile('collection.json')

    await assert.rejects(writeSchematicArtifact(tmpDir), SchematicArtifactException)
  } finally {
    await resetArtifact()
    await rm(tmpDir, { recursive: true, force: true })
  }
})
