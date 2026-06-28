import { access }                     from 'node:fs/promises'
import { cp }                         from 'node:fs/promises'
import { join }                       from 'node:path'

import { SchematicArtifactException } from '../exceptions/index.js'

const REQUIRED_ARTIFACT_FILES = ['collection.json', 'project/project.factory.cjs']

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

const getSchematicArtifactCandidates = (): Array<string> => [
  join(import.meta.dirname, '../schematic'),
  join(import.meta.dirname, '../../dist/schematic'),
]

const isSchematicArtifact = async (candidate: string): Promise<boolean> => {
  const checks = await Promise.all(
    REQUIRED_ARTIFACT_FILES.map(async (requiredFile) => pathExists(join(candidate, requiredFile)))
  )

  return checks.every(Boolean)
}

const resolveSchematicArtifactDir = async (): Promise<string> => {
  const candidates = getSchematicArtifactCandidates()
  const existingArtifacts = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      exists: await isSchematicArtifact(candidate),
    }))
  )
  const artifact = existingArtifacts.find(({ exists }) => exists)

  if (artifact) {
    return artifact.candidate
  }

  throw new SchematicArtifactException(candidates)
}

export const writeSchematicArtifact = async (baseDir: string): Promise<void> => {
  const schematicArtifactDir = await resolveSchematicArtifactDir()

  await cp(schematicArtifactDir, baseDir, { recursive: true })
}
