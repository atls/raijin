import type { PortablePath } from '@yarnpkg/fslib'

import { arch }              from 'node:os'

import { xfs }               from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'

const PROJECT_DESCRIPTOR_SCHEMA_VERSION = '0.2'
const GIT_EXCLUDE_PATH = '.git'
const LOCKFILE_PATH = 'yarn.lock' as PortablePath
const YARNRC_PATH = '.yarnrc.yml' as PortablePath
const DEFAULT_IMAGE_OS = 'linux'
const DEFAULT_LINUX_LIBC = 'glibc'
const PNP_MANIFEST_PATH = '.pnp.cjs' as PortablePath
const PNP_DATA_PATH = '.pnp.data.json' as PortablePath
const UNPLUGGED_EXCLUDE_PATH = '.yarn/unplugged'
const PACKAGE_LOCATION_REGEXP = /["'`]([^"'`]*)["'`]/g
const NODE_MODULES_REFERENCE_REGEXP = /\/node_modules\/(.+)$/
const PNP_UNPLUGGED_FOLDER_REGEXP = /(?:^|\n)pnpUnpluggedFolder:\s*([^#\n]+)/
const VIRTUAL_PACKAGE_REFERENCE_REGEXP = /^virtual:[^#]+#(.+)$/
const CPU_ALIASES = {
  386: 'ia32',
  amd64: 'x64',
  mips64le: 'mips64el',
  ppc64le: 'ppc64',
} as Record<string, string>

interface TargetPlatform {
  os: string
  cpu?: string
  libc?: string
}

interface ConditionalPackageLocator {
  packageName: string
  packageReference: string
  target: boolean
}

interface ConditionalPackageLocatorIndex {
  conditionalLocators: Map<string, ConditionalPackageLocator>
  unconditionalPackageNames: Set<string>
}

interface PnpPackageData {
  packageLocation?: string
}

interface PnpUnpluggedReference {
  reference: PortablePath
  locator?: {
    packageName: string
    packageReference: string
  }
}

type ConditionToken = string

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

const normalizeUnpluggedFolder = (folder: string): PortablePath => {
  const normalizedFolder = ppath.normalize(folder.replace(/^['"]|['"]$/g, '') as PortablePath)

  if (normalizedFolder.endsWith('/')) {
    return normalizedFolder.slice(0, -1) as PortablePath
  }

  return normalizedFolder
}

const getConfiguredUnpluggedFolder = (content: string): PortablePath | undefined => {
  const match = content.match(PNP_UNPLUGGED_FOLDER_REGEXP)
  const value = match?.[1]?.trim()

  return value ? normalizeUnpluggedFolder(value) : undefined
}

const getWorkspaceUnpluggedFolders = async (cwd: PortablePath): Promise<Array<PortablePath>> => {
  const folders = new Set<PortablePath>([normalizeUnpluggedFolder(UNPLUGGED_EXCLUDE_PATH)])
  const yarnrcPath = ppath.join(cwd, YARNRC_PATH)

  if (await xfs.existsPromise(yarnrcPath)) {
    const configuredFolder = getConfiguredUnpluggedFolder(
      await xfs.readFilePromise(yarnrcPath, 'utf8')
    )

    if (configuredFolder) {
      folders.add(configuredFolder)
    }
  }

  return Array.from(folders).sort()
}

const normalizeUnpluggedReference = (
  reference: string,
  unpluggedFolders: Array<PortablePath>
): PortablePath | undefined => {
  const normalizedReference = reference.replaceAll('\\', '/')
  const unpluggedFolder = unpluggedFolders.find((folder) =>
    normalizedReference.includes(`${folder}/`))

  if (!unpluggedFolder) {
    return undefined
  }

  const referenceStart = normalizedReference.indexOf(`${unpluggedFolder}/`)
  const unpluggedReference = ppath.normalize(
    normalizedReference.slice(referenceStart) as PortablePath
  )

  if (unpluggedReference.endsWith('/')) {
    return unpluggedReference.slice(0, -1) as PortablePath
  }

  return unpluggedReference
}

export const getPnpUnpluggedReferences = (
  content: string,
  unpluggedFolders: Array<PortablePath> = [normalizeUnpluggedFolder(UNPLUGGED_EXCLUDE_PATH)]
): Array<PortablePath> => {
  const references = new Set<string>()

  for (const match of content.matchAll(PACKAGE_LOCATION_REGEXP)) {
    const reference = normalizeUnpluggedReference(match[1], unpluggedFolders)

    if (reference) {
      references.add(reference)
    }
  }

  return Array.from(references).sort() as Array<PortablePath>
}

const parsePnpCjsRuntimeState = (content: string): unknown => {
  const match = content.match(/const RAW_RUNTIME_STATE\s*=\s*'([\s\S]*?)';/)

  if (!match) {
    return undefined
  }

  return JSON.parse(match[1].replace(/\\\r?\n/g, ''))
}

const parsePnpRuntimeState = (content: string): unknown => {
  try {
    return JSON.parse(content)
  } catch {
    return parsePnpCjsRuntimeState(content)
  }
}

const getPnpPackageRegistryData = (
  content: string
): Array<[string, Array<[string, PnpPackageData]>]> => {
  const runtimeState = parsePnpRuntimeState(content)

  if (!runtimeState || typeof runtimeState !== 'object') {
    return []
  }

  const { packageRegistryData } = runtimeState as { packageRegistryData?: unknown }

  return Array.isArray(packageRegistryData)
    ? (packageRegistryData as Array<[string, Array<[string, PnpPackageData]>]>)
    : []
}

const normalizePnpPackageReference = (packageReference: string): string =>
  packageReference.match(VIRTUAL_PACKAGE_REFERENCE_REGEXP)?.[1] ?? packageReference

const getPnpUnpluggedReferenceEntries = (
  content: string,
  unpluggedFolders: Array<PortablePath>
): Array<PnpUnpluggedReference> => {
  const entries = new Map<PortablePath, PnpUnpluggedReference>()

  for (const [packageName, packageStoreData] of getPnpPackageRegistryData(content)) {
    if (!packageName || !Array.isArray(packageStoreData)) {
      continue
    }

    for (const [packageReference, packageData] of packageStoreData) {
      const reference = packageData.packageLocation
        ? normalizeUnpluggedReference(packageData.packageLocation, unpluggedFolders)
        : undefined

      if (reference && packageReference) {
        entries.set(reference, {
          reference,
          locator: {
            packageName,
            packageReference: normalizePnpPackageReference(packageReference),
          },
        })
      }
    }
  }

  for (const reference of getPnpUnpluggedReferences(content, unpluggedFolders)) {
    if (!entries.has(reference)) {
      entries.set(reference, { reference })
    }
  }

  return Array.from(entries.values())
}

const getWorkspacePnpUnpluggedReferences = async (
  cwd: PortablePath
): Promise<Array<PnpUnpluggedReference>> => {
  const references = new Map<PortablePath, PnpUnpluggedReference>()
  const unpluggedFolders = await getWorkspaceUnpluggedFolders(cwd)
  const manifestsReferences = await Promise.all(
    [PNP_MANIFEST_PATH, PNP_DATA_PATH].map(async (manifestPath) => {
      const pnpManifestPath = ppath.join(cwd, manifestPath)

      if (!(await xfs.existsPromise(pnpManifestPath))) {
        return []
      }

      const content = await xfs.readFilePromise(pnpManifestPath, 'utf8')

      return getPnpUnpluggedReferenceEntries(content, unpluggedFolders)
    })
  )

  for (const manifestReferences of manifestsReferences) {
    for (const referenceEntry of manifestReferences) {
      const existingEntry = references.get(referenceEntry.reference)

      references.set(
        referenceEntry.reference,
        existingEntry?.locator ? existingEntry : referenceEntry
      )
    }
  }

  return Array.from(references.values()).sort((a, b) => a.reference.localeCompare(b.reference))
}

const normalizeTargetCpu = (cpu: string | undefined): string | undefined => {
  if (!cpu) {
    return undefined
  }

  return CPU_ALIASES[cpu] ?? cpu
}

const getTargetPlatform = (platform: string | undefined): TargetPlatform => {
  const [os, cpu] = platform?.split('/').slice(0, 2) ?? []
  const targetOs = os || DEFAULT_IMAGE_OS

  return {
    os: targetOs,
    cpu: normalizeTargetCpu(cpu) ?? normalizeTargetCpu(arch()),
    libc: targetOs === 'linux' ? DEFAULT_LINUX_LIBC : undefined,
  }
}

const tokenizeConditionExpression = (conditions: string): Array<ConditionToken> =>
  conditions.match(/[()&|!=]|[A-Za-z0-9_.-]+/g) ?? []

class ConditionExpressionParser {
  constructor(
    private readonly tokens: Array<ConditionToken>,
    private readonly targetPlatform: TargetPlatform
  ) {}

  parse(): boolean {
    const expression = this.parseOr(0)

    return Boolean(expression && expression.next === this.tokens.length && expression.target)
  }

  private isTargetCondition(index: number): { next: number; target: boolean } | undefined {
    const key = this.tokens[index]
    const operator = this.tokens[index + 1]
    const value = this.tokens[index + 2]

    if (!key || operator !== '=' || !value) {
      return undefined
    }

    const next = index + 3

    switch (key) {
      case 'os':
        return { next, target: this.targetPlatform.os === value }
      case 'cpu':
        return { next, target: this.targetPlatform.cpu === value }
      case 'libc':
        return { next, target: this.targetPlatform.libc === value }
      default:
        return { next, target: false }
    }
  }

  private parsePrimary(index: number): { next: number; target: boolean } | undefined {
    if (this.tokens[index] === '(') {
      const expression = this.parseOr(index + 1)

      if (!expression || this.tokens[expression.next] !== ')') {
        return undefined
      }

      return { next: expression.next + 1, target: expression.target }
    }

    return this.isTargetCondition(index)
  }

  private parseUnary(index: number): { next: number; target: boolean } | undefined {
    if (this.tokens[index] === '!') {
      const expression = this.parseUnary(index + 1)

      return expression ? { next: expression.next, target: !expression.target } : undefined
    }

    return this.parsePrimary(index)
  }

  private parseAnd(index: number): { next: number; target: boolean } | undefined {
    let expression = this.parseUnary(index)

    if (!expression) {
      return undefined
    }

    while (this.tokens[expression.next] === '&') {
      const nextExpression = this.parseUnary(expression.next + 1)

      if (!nextExpression) {
        return undefined
      }

      expression = {
        next: nextExpression.next,
        target: expression.target && nextExpression.target,
      }
    }

    return expression
  }

  private parseOr(index: number): { next: number; target: boolean } | undefined {
    let expression = this.parseAnd(index)

    if (!expression) {
      return undefined
    }

    while (this.tokens[expression.next] === '|') {
      const nextExpression = this.parseAnd(expression.next + 1)

      if (!nextExpression) {
        return undefined
      }

      expression = {
        next: nextExpression.next,
        target: expression.target || nextExpression.target,
      }
    }

    return expression
  }
}

const isTargetConditionalPackage = (
  conditions: string,
  targetPlatform: TargetPlatform
): boolean => {
  const tokens = tokenizeConditionExpression(conditions)

  return new ConditionExpressionParser(tokens, targetPlatform).parse()
}

const getLocatorPackageName = (locator: string): string | undefined => {
  const packageNameEnd = locator.startsWith('@') ? locator.indexOf('@', 1) : locator.indexOf('@')

  if (packageNameEnd === -1) {
    return undefined
  }

  return locator.slice(0, packageNameEnd)
}

const getLocatorPackageReference = (locator: string, packageName: string): string | undefined => {
  if (!locator.startsWith(`${packageName}@`)) {
    return undefined
  }

  return locator.slice(packageName.length + 1)
}

const getLocatorKey = (packageName: string, packageReference: string): string =>
  `${packageName}\0${packageReference}`

const getConditionalPackageLocators = (
  lockfileContent: string,
  targetPlatform: TargetPlatform
): ConditionalPackageLocatorIndex => {
  const conditionalLocators = new Map<string, ConditionalPackageLocator>()
  const unconditionalPackageNames = new Set<string>()

  for (const block of lockfileContent.split(/\n{2,}/)) {
    const resolution = block.match(/\n {2}resolution: "([^"]+)"/)?.[1]
    const conditions = block.match(/\n {2}conditions: (.+)/)?.[1]
    const packageName = resolution ? getLocatorPackageName(resolution) : undefined
    const packageReference = packageName
      ? getLocatorPackageReference(resolution ?? '', packageName)
      : undefined

    if (!packageName || !packageReference) {
      continue
    }

    if (!conditions) {
      unconditionalPackageNames.add(packageName)

      continue
    }

    const locator = {
      packageName,
      packageReference,
      target: isTargetConditionalPackage(conditions, targetPlatform),
    }

    conditionalLocators.set(getLocatorKey(packageName, packageReference), locator)
  }

  return {
    conditionalLocators,
    unconditionalPackageNames,
  }
}

const getWorkspaceConditionalPackageLocators = async (
  cwd: PortablePath,
  targetPlatform: TargetPlatform
): Promise<ConditionalPackageLocatorIndex> => {
  const lockfilePath = ppath.join(cwd, LOCKFILE_PATH)

  if (!(await xfs.existsPromise(lockfilePath))) {
    return {
      conditionalLocators: new Map(),
      unconditionalPackageNames: new Set(),
    }
  }

  return getConditionalPackageLocators(
    await xfs.readFilePromise(lockfilePath, 'utf8'),
    targetPlatform
  )
}

const getUnpluggedReferencePackageName = (reference: PortablePath): string | undefined => {
  const match = reference.match(NODE_MODULES_REFERENCE_REGEXP)

  if (!match) {
    return undefined
  }

  return match[1]
}

const isConditionalUnpluggedReference = (
  referenceEntry: PnpUnpluggedReference,
  conditionalPackageLocators: ConditionalPackageLocatorIndex
): boolean => {
  if (referenceEntry.locator) {
    const conditionalPackageLocator = conditionalPackageLocators.conditionalLocators.get(
      getLocatorKey(referenceEntry.locator.packageName, referenceEntry.locator.packageReference)
    )

    return conditionalPackageLocator ? !conditionalPackageLocator.target : false
  }

  const packageName = getUnpluggedReferencePackageName(referenceEntry.reference)

  if (!packageName || conditionalPackageLocators.unconditionalPackageNames.has(packageName)) {
    return false
  }

  const conditionalPackageLocatorsForPackage = Array.from(
    conditionalPackageLocators.conditionalLocators.values()
  ).filter((conditionalPackageLocator) => conditionalPackageLocator.packageName === packageName)

  return (
    conditionalPackageLocatorsForPackage.length > 0 &&
    conditionalPackageLocatorsForPackage.every(
      (conditionalPackageLocator) => !conditionalPackageLocator.target
    )
  )
}

const getMissingReferences = async (
  cwd: PortablePath,
  references: Array<PnpUnpluggedReference>,
  conditionalPackageLocators: ConditionalPackageLocatorIndex
): Promise<Array<PortablePath>> => {
  const referencesState = await Promise.all(
    references.map(async (referenceEntry) => ({
      exists: await xfs.existsPromise(ppath.join(cwd, referenceEntry.reference)),
      referenceEntry,
    }))
  )

  return referencesState
    .filter(
      ({ exists, referenceEntry }) =>
        !exists && !isConditionalUnpluggedReference(referenceEntry, conditionalPackageLocators)
    )
    .map(({ referenceEntry }) => referenceEntry.reference)
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
