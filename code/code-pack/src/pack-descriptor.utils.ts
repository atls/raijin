import type { PortablePath } from '@yarnpkg/fslib'

import { xfs }               from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'

const PROJECT_DESCRIPTOR_SCHEMA_VERSION = '0.2'
const GIT_EXCLUDE_PATH = '.git'
const PNP_MANIFEST_PATH = '.pnp.cjs' as PortablePath
const PNP_DATA_PATH = '.pnp.data.json' as PortablePath
const UNPLUGGED_EXCLUDE_PATH = '.yarn/unplugged'
const UNPLUGGED_REFERENCE_PREFIX = '.yarn/unplugged/'
const UNPLUGGED_REFERENCE_REGEXP = /["'`]([^"'`]*\.yarn\/unplugged\/[^"'`]*)["'`]/g

export interface BuildEnv extends Record<string, string> {
  name: string
  value: string
}

export interface CreateProjectDescriptorOptions {
  repo: string
  builder: string
  envs: Array<BuildEnv>
  cwd: PortablePath
}

const normalizeUnpluggedReference = (reference: string): PortablePath | undefined => {
  const normalizedReference = reference.replaceAll('\\', '/')
  const referenceStart = normalizedReference.indexOf(UNPLUGGED_REFERENCE_PREFIX)

  if (referenceStart === -1) {
    return undefined
  }

  const unpluggedReference = ppath.normalize(
    normalizedReference.slice(referenceStart) as PortablePath
  )

  if (unpluggedReference.endsWith('/')) {
    return unpluggedReference.slice(0, -1) as PortablePath
  }

  return unpluggedReference
}

export const getPnpUnpluggedReferences = (content: string): Array<PortablePath> => {
  const references = new Set<string>()

  for (const match of content.matchAll(UNPLUGGED_REFERENCE_REGEXP)) {
    const reference = normalizeUnpluggedReference(match[1])

    if (reference) {
      references.add(reference)
    }
  }

  return Array.from(references).sort() as Array<PortablePath>
}

const getWorkspacePnpUnpluggedReferences = async (
  cwd: PortablePath
): Promise<Array<PortablePath>> => {
  const references = new Set<PortablePath>()
  const manifestsReferences = await Promise.all(
    [PNP_MANIFEST_PATH, PNP_DATA_PATH].map(async (manifestPath) => {
      const pnpManifestPath = ppath.join(cwd, manifestPath)

      if (!(await xfs.existsPromise(pnpManifestPath))) {
        return []
      }

      const content = await xfs.readFilePromise(pnpManifestPath, 'utf8')

      return getPnpUnpluggedReferences(content)
    })
  )

  for (const manifestReferences of manifestsReferences) {
    for (const reference of manifestReferences) {
      references.add(reference)
    }
  }

  return Array.from(references).sort()
}

const getMissingReferences = async (
  cwd: PortablePath,
  references: Array<PortablePath>
): Promise<Array<PortablePath>> => {
  const referencesState = await Promise.all(
    references.map(async (reference) => ({
      exists: await xfs.existsPromise(ppath.join(cwd, reference)),
      reference,
    }))
  )

  return referencesState.filter(({ exists }) => !exists).map(({ reference }) => reference)
}

const getBuildContextExcludes = async (cwd: PortablePath): Promise<Array<string>> => {
  const references = await getWorkspacePnpUnpluggedReferences(cwd)

  if (references.length === 0) {
    return [GIT_EXCLUDE_PATH, UNPLUGGED_EXCLUDE_PATH]
  }

  const missingReferences = await getMissingReferences(cwd, references)

  if (missingReferences.length > 0) {
    throw new Error(
      [
        'PnP manifest references unplugged packages that are missing from the image pack context:',
        ...missingReferences.map((reference) => `- ${reference}`),
      ].join('\n')
    )
  }

  return [GIT_EXCLUDE_PATH]
}

export const createProjectDescriptor = async ({
  repo,
  builder,
  envs,
  cwd,
}: CreateProjectDescriptorOptions) => ({
  _: {
    'schema-version': PROJECT_DESCRIPTOR_SCHEMA_VERSION,
    id: repo,
    name: repo,
    version: '0.0.1',
  },
  io: {
    buildpacks: {
      exclude: await getBuildContextExcludes(cwd),
      builder,
      build: {
        env: envs,
      },
    },
  },
})
