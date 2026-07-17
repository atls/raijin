import type { FakeFS }       from '@yarnpkg/fslib'
import type { Filename }     from '@yarnpkg/fslib'
import type { PortablePath } from '@yarnpkg/fslib'

import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

const COLLECTION_FILE = 'collection.json' as Filename
const REQUIRED_FILES = [COLLECTION_FILE, 'project/project.factory.cjs' as PortablePath]

export const assertProjectGenerationArtifact = async (
  artifactDir: PortablePath,
  baseFs: FakeFS<PortablePath> = xfs
): Promise<void> => {
  const checks = await Promise.all(
    REQUIRED_FILES.map(async (file) => baseFs.existsPromise(ppath.join(artifactDir, file)))
  )

  if (checks.every(Boolean)) {
    return
  }

  throw new Error(
    `Raijin project generation artifact is missing from the installed package. Reinstall @atls/raijin. Checked path: ${artifactDir}`
  )
}

export const resolveProjectCollectionPath = (artifactDir: PortablePath): PortablePath =>
  ppath.join(artifactDir, COLLECTION_FILE)
