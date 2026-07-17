import { access }        from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname }       from 'node:path'
import { join }          from 'node:path'

const PACKAGE_MANIFEST_SPECIFIER = '@atls/raijin/package.json'
const REQUIRED_ARTIFACT_FILES = ['collection.json', 'project/project.factory.cjs']

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

const isProjectGenerationArtifact = async (candidate: string): Promise<boolean> => {
  const checks = await Promise.all(
    REQUIRED_ARTIFACT_FILES.map(async (file) => pathExists(join(candidate, file)))
  )

  return checks.every(Boolean)
}

export const getProjectGenerationArtifactDir = (): string => {
  const require = createRequire(import.meta.url)
  const packageRoot = dirname(require.resolve(PACKAGE_MANIFEST_SPECIFIER))

  return join(packageRoot, 'dist/schematic')
}

export const resolveProjectGenerationArtifactDir = async (
  artifactDir = getProjectGenerationArtifactDir()
): Promise<string> => {
  if (await isProjectGenerationArtifact(artifactDir)) {
    return artifactDir
  }

  throw new Error(
    `Raijin project generation artifact is missing from the installed package. Reinstall @atls/raijin. Checked path: ${artifactDir}`
  )
}

export const resolveProjectCollectionPath = async (): Promise<string> =>
  join(await resolveProjectGenerationArtifactDir(), 'collection.json')
