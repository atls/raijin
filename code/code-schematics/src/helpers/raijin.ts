import { access }                     from 'node:fs/promises'
import { cp }                         from 'node:fs/promises'
import { join }                       from 'node:path'

import tsconfig                       from '@atls/config-typescript'

import { SchematicArtifactException } from '../exceptions/index.js'

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

const getSchematicArtifactCandidates = (cwd: string): Array<string> => [
  join(cwd, 'code/code-schematics/dist/schematic'),
  join(import.meta.dirname, '../schematic'),
  join(import.meta.dirname, '../../dist/schematic'),
]

const resolveSchematicArtifactDir = async (cwd: string): Promise<string> => {
  const candidates = getSchematicArtifactCandidates(cwd)
  const existingArtifacts = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      exists: await pathExists(join(candidate, 'collection.json')),
    }))
  )
  const artifact = existingArtifacts.find(({ exists }) => exists)

  if (artifact) {
    return artifact.candidate
  }

  throw new SchematicArtifactException(candidates)
}

export const writeRaijinFiles = async (_cwd: string, baseDir: string): Promise<void> => {
  const schematicArtifactDir = await resolveSchematicArtifactDir(_cwd)

  await cp(schematicArtifactDir, baseDir, { recursive: true })
}

export const getRaijinCompilerOptions = async (_cwd: string): Promise<object> =>
  tsconfig.compilerOptions
