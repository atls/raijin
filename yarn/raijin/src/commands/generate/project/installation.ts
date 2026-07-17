import { access }                           from 'node:fs/promises'
import { cp }                               from 'node:fs/promises'
import { mkdir }                            from 'node:fs/promises'
import { rm }                               from 'node:fs/promises'
import { createRequire }                    from 'node:module'
import { dirname }                          from 'node:path'
import { join }                             from 'node:path'

import { npath }                            from '@yarnpkg/fslib'

import { PROJECT_GENERATION_ARTIFACT_PATH } from './artifact.js'

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

export const resolveProjectGenerationArtifactDir = async (): Promise<string> => {
  const artifactDir = getProjectGenerationArtifactDir()

  if (await isProjectGenerationArtifact(artifactDir)) {
    return artifactDir
  }

  throw new Error(
    `Raijin project generation artifact is missing. Run \`yarn workspace @atls/raijin build:schematic\`. Checked path: ${artifactDir}`
  )
}

export const installProjectGenerationArtifact = async (
  cwd: string,
  artifactDir?: string
): Promise<void> => {
  const source = artifactDir ?? (await resolveProjectGenerationArtifactDir())
  const target = join(cwd, npath.fromPortablePath(PROJECT_GENERATION_ARTIFACT_PATH))

  await rm(target, { recursive: true, force: true })
  await mkdir(dirname(target), { recursive: true })
  await cp(source, target, { recursive: true })
}
