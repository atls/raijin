import { access }  from 'node:fs/promises'
import { cp }      from 'node:fs/promises'
import { mkdir }   from 'node:fs/promises'
import { rm }      from 'node:fs/promises'
import { dirname } from 'node:path'
import { join }    from 'node:path'

const REQUIRED_SCHEMATIC_ARTIFACT_FILES = ['collection.json', 'project/project.factory.cjs']
const RAIJIN_SCHEMATIC_PATH = '.yarn/schematic'

export type RaijinSchematicInstaller = (cwd: string) => Promise<void>

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

const isSchematicArtifact = async (candidate: string): Promise<boolean> => {
  const checks = await Promise.all(
    REQUIRED_SCHEMATIC_ARTIFACT_FILES.map(async (requiredFile) =>
      pathExists(join(candidate, requiredFile)))
  )

  return checks.every(Boolean)
}

const getRaijinSchematicArtifactCandidates = (): Array<string> => [
  join(import.meta.dirname, '../schematic'),
  join(import.meta.dirname, '../../dist/schematic'),
]

export const resolveRaijinSchematicArtifactDir = async (): Promise<string> => {
  const candidates = getRaijinSchematicArtifactCandidates()
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

  throw new Error(`Raijin schematic artifact is missing. Checked paths: ${candidates.join(', ')}`)
}

export const installRaijinSchematicArtifact = async (
  cwd: string,
  artifactDir?: string
): Promise<void> => {
  const source = artifactDir ?? (await resolveRaijinSchematicArtifactDir())
  const target = join(cwd, RAIJIN_SCHEMATIC_PATH)

  await rm(target, { recursive: true, force: true })
  await mkdir(dirname(target), { recursive: true })
  await cp(source, target, { recursive: true })
}
