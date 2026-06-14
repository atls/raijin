import type { PortablePath } from '@yarnpkg/fslib'

import { arch }              from 'node:os'

import { xfs }               from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'

const PROJECT_DESCRIPTOR_SCHEMA_VERSION = '0.2'
const GIT_EXCLUDE_PATH = '.git'
const LOCKFILE_PATH = 'yarn.lock' as PortablePath
const DEFAULT_IMAGE_OS = 'linux'
const NPM_PROTOCOL = 'npm:'
const UNPLUGGED_FOLDER_NPM_DELIMITER = '-npm-'
const PNP_MANIFEST_PATH = '.pnp.cjs' as PortablePath
const PNP_DATA_PATH = '.pnp.data.json' as PortablePath
const UNPLUGGED_EXCLUDE_PATH = '.yarn/unplugged'
const UNPLUGGED_REFERENCE_PREFIX = '.yarn/unplugged/'
const UNPLUGGED_REFERENCE_REGEXP = /["'`]([^"'`]*\.yarn\/unplugged\/[^"'`]*)["'`]/g
const NODE_MODULES_REFERENCE_REGEXP = /^\.yarn\/unplugged\/([^/]+)\/node_modules\/(.+)$/

interface TargetPlatform {
  os: string
  cpu?: string
}

interface ConditionalPackageLocator {
  locator: string
  conditions: string
  target: boolean
}

export interface BuildEnv extends Record<string, string> {
  name: string
  value: string
}

export interface CreateProjectDescriptorOptions {
  repo: string
  builder: string
  envs: Array<BuildEnv>
  cwd: PortablePath
  platform?: string
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

const normalizeTargetCpu = (cpu: string | undefined): string | undefined => {
  switch (cpu) {
    case 'amd64':
      return 'x64'
    case 'arm':
    case 'arm64':
    case 'ia32':
    case 'ppc64':
    case 's390x':
    case 'x64':
      return cpu
    default:
      return undefined
  }
}

const getTargetPlatform = (platform: string | undefined): TargetPlatform => {
  const [os, cpu] = platform?.split('/').slice(0, 2) ?? []

  return {
    os: os || DEFAULT_IMAGE_OS,
    cpu: normalizeTargetCpu(cpu) ?? normalizeTargetCpu(arch()),
  }
}

const isTargetCondition = (condition: string, targetPlatform: TargetPlatform): boolean => {
  const [key, value] = condition.split('=').map((part) => part.trim())

  switch (key) {
    case 'os':
      return targetPlatform.os === value
    case 'cpu':
      return targetPlatform.cpu === value
    default:
      return true
  }
}

const isTargetConditionalPackage = (conditions: string, targetPlatform: TargetPlatform): boolean =>
  conditions.split(/\s*&\s*/).every((condition) => isTargetCondition(condition, targetPlatform))

const getConditionalPackageLocators = (
  lockfileContent: string,
  targetPlatform: TargetPlatform
): Map<string, ConditionalPackageLocator> => {
  const locators = new Map<string, ConditionalPackageLocator>()

  for (const block of lockfileContent.split(/\n{2,}/)) {
    if (!block.includes('\n  conditions:')) {
      continue
    }

    const resolution = block.match(/\n {2}resolution: "([^"]+)"/)?.[1]
    const conditions = block.match(/\n {2}conditions: (.+)/)?.[1]

    if (resolution && conditions) {
      locators.set(resolution, {
        locator: resolution,
        conditions,
        target: isTargetConditionalPackage(conditions, targetPlatform),
      })
    }
  }

  return locators
}

const getWorkspaceConditionalPackageLocators = async (
  cwd: PortablePath,
  targetPlatform: TargetPlatform
): Promise<Map<string, ConditionalPackageLocator>> => {
  const lockfilePath = ppath.join(cwd, LOCKFILE_PATH)

  if (!(await xfs.existsPromise(lockfilePath))) {
    return new Map()
  }

  return getConditionalPackageLocators(
    await xfs.readFilePromise(lockfilePath, 'utf8'),
    targetPlatform
  )
}

const getUnpluggedReferenceLocator = (reference: PortablePath): string | undefined => {
  const match = reference.match(NODE_MODULES_REFERENCE_REGEXP)

  if (!match) {
    return undefined
  }

  const [, unpluggedFolder, packageName] = match
  const npmDelimiterIndex = unpluggedFolder.lastIndexOf(UNPLUGGED_FOLDER_NPM_DELIMITER)

  if (npmDelimiterIndex === -1) {
    return undefined
  }

  const versionWithHash = unpluggedFolder.slice(
    npmDelimiterIndex + UNPLUGGED_FOLDER_NPM_DELIMITER.length
  )
  const hashDelimiterIndex = versionWithHash.lastIndexOf('-')

  if (hashDelimiterIndex === -1) {
    return undefined
  }

  const version = versionWithHash.slice(0, hashDelimiterIndex)

  return `${packageName}@${NPM_PROTOCOL}${version}`
}

const isConditionalUnpluggedReference = (
  reference: PortablePath,
  conditionalPackageLocators: Map<string, ConditionalPackageLocator>
): boolean => {
  const locator = getUnpluggedReferenceLocator(reference)
  const conditionalPackageLocator = locator ? conditionalPackageLocators.get(locator) : undefined

  return conditionalPackageLocator ? !conditionalPackageLocator.target : false
}

const getMissingReferences = async (
  cwd: PortablePath,
  references: Array<PortablePath>,
  conditionalPackageLocators: Map<string, ConditionalPackageLocator>
): Promise<Array<PortablePath>> => {
  const referencesState = await Promise.all(
    references.map(async (reference) => ({
      exists: await xfs.existsPromise(ppath.join(cwd, reference)),
      reference,
    }))
  )

  return referencesState
    .filter(
      ({ exists, reference }) =>
        !exists && !isConditionalUnpluggedReference(reference, conditionalPackageLocators)
    )
    .map(({ reference }) => reference)
}

const getBuildContextExcludes = async (
  cwd: PortablePath,
  platform: string | undefined
): Promise<Array<string>> => {
  const references = await getWorkspacePnpUnpluggedReferences(cwd)

  if (references.length === 0) {
    return [GIT_EXCLUDE_PATH, UNPLUGGED_EXCLUDE_PATH]
  }

  const targetPlatform = getTargetPlatform(platform)
  const conditionalPackageLocators = await getWorkspaceConditionalPackageLocators(
    cwd,
    targetPlatform
  )
  const missingReferences = await getMissingReferences(cwd, references, conditionalPackageLocators)

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
  platform,
}: CreateProjectDescriptorOptions) => ({
  _: {
    'schema-version': PROJECT_DESCRIPTOR_SCHEMA_VERSION,
    id: repo,
    name: repo,
    version: '0.0.1',
  },
  io: {
    buildpacks: {
      exclude: await getBuildContextExcludes(cwd, platform),
      builder,
      build: {
        env: envs,
      },
    },
  },
})
