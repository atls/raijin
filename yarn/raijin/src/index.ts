import { spawn }      from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir }      from 'node:fs/promises'
import { readFile }   from 'node:fs/promises'
import { writeFile }  from 'node:fs/promises'
import { dirname }    from 'node:path'
import { join }       from 'node:path'

const RAIJIN_RUNTIME_MANIFEST_URL =
  'https://raw.githubusercontent.com/atls/raijin/master/.yarn/releases/raijin-runtime.json'
const RAIJIN_RUNTIME_PACKAGE_NAME = '@atls/yarn-cli'
const RAIJIN_RUNTIME_ASSET_NAME = 'yarn.mjs'
const RAIJIN_RUNTIME_MANIFEST_SCHEMA_VERSION = 1
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const CODE_RUNTIME_PACKAGE = '@atls/code-runtime@latest'
const YARNRC_PATH = '.yarnrc.yml'
const TOP_LEVEL_YARN_PATH_PATTERN = /^yarnPath:.*$/m

type FetchLike = typeof fetch

export interface RaijinRuntimeManifest {
  assetName: string
  assetUrl: string
  packageName: string
  schemaVersion: number
  sha256: string
  tagName: string
  version: string
}

export interface RunRaijinInitializerOptions {
  argv?: Array<string>
  cwd?: string
  fetchImpl?: FetchLike
  runYarnCommand?: YarnCommandRunner
}

export type YarnCommandRunner = (args: Array<string>, cwd: string) => Promise<void>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const assertManifestString = (
  manifest: Record<string, unknown>,
  key: keyof RaijinRuntimeManifest
): string => {
  const value = manifest[key]

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid Raijin runtime manifest: missing ${key}`)
  }

  return value
}

export const parseRaijinRuntimeManifest = (value: unknown): RaijinRuntimeManifest => {
  if (!isRecord(value)) {
    throw new Error('Invalid Raijin runtime manifest: expected object')
  }

  if (value.schemaVersion !== RAIJIN_RUNTIME_MANIFEST_SCHEMA_VERSION) {
    throw new Error('Invalid Raijin runtime manifest: unsupported schemaVersion')
  }

  const packageName = assertManifestString(value, 'packageName')
  const assetName = assertManifestString(value, 'assetName')
  const sha256 = assertManifestString(value, 'sha256')

  if (packageName !== RAIJIN_RUNTIME_PACKAGE_NAME) {
    throw new Error(`Invalid Raijin runtime manifest: expected ${RAIJIN_RUNTIME_PACKAGE_NAME}`)
  }

  if (assetName !== RAIJIN_RUNTIME_ASSET_NAME) {
    throw new Error(`Invalid Raijin runtime manifest: expected ${RAIJIN_RUNTIME_ASSET_NAME}`)
  }

  if (!SHA256_PATTERN.test(sha256)) {
    throw new Error('Invalid Raijin runtime manifest: invalid sha256')
  }

  return {
    assetName,
    assetUrl: assertManifestString(value, 'assetUrl'),
    packageName,
    schemaVersion: RAIJIN_RUNTIME_MANIFEST_SCHEMA_VERSION,
    sha256,
    tagName: assertManifestString(value, 'tagName'),
    version: assertManifestString(value, 'version'),
  }
}

export const createSha256Digest = (data: Buffer): string =>
  createHash('sha256').update(data).digest('hex')

export const getRaijinRuntimeYarnPath = (manifest: RaijinRuntimeManifest): string =>
  `.yarn/releases/raijin-yarn-${manifest.version}.mjs`

export const createYarnCommandEnvironment = (
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  const yarnEnvironment = { ...environment }

  delete yarnEnvironment.YARN_IGNORE_PATH

  return yarnEnvironment
}

export const updateYarnPathConfiguration = (content: string, yarnPath: string): string => {
  const yarnPathLine = `yarnPath: ${yarnPath}`
  const normalizedContent = content.trimEnd()

  if (TOP_LEVEL_YARN_PATH_PATTERN.test(normalizedContent)) {
    return `${normalizedContent.replace(TOP_LEVEL_YARN_PATH_PATTERN, yarnPathLine)}\n`
  }

  if (normalizedContent.length === 0) {
    return `${yarnPathLine}\n`
  }

  return `${normalizedContent}\n${yarnPathLine}\n`
}

const fetchJson = async (fetchImpl: FetchLike, url: string): Promise<unknown> => {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'raijin-initializer',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download Raijin runtime manifest: ${response.status}`)
  }

  return response.json()
}

const fetchBuffer = async (fetchImpl: FetchLike, url: string): Promise<Buffer> => {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/octet-stream',
      'user-agent': 'raijin-initializer',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download Raijin runtime asset: ${response.status}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

const readTextOrEmpty = async (path: string): Promise<string> => {
  try {
    return await readFile(path, 'utf-8')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return ''
    }

    throw error
  }
}

export const installRaijinRuntime = async ({
  cwd,
  fetchImpl,
}: {
  cwd: string
  fetchImpl: FetchLike
}): Promise<RaijinRuntimeManifest> => {
  const manifest = parseRaijinRuntimeManifest(
    await fetchJson(fetchImpl, RAIJIN_RUNTIME_MANIFEST_URL)
  )
  const runtime = await fetchBuffer(fetchImpl, manifest.assetUrl)
  const digest = createSha256Digest(runtime)

  if (digest !== manifest.sha256) {
    throw new Error(
      `Downloaded Raijin runtime digest mismatch: expected ${manifest.sha256}, got ${digest}`
    )
  }

  const yarnPath = getRaijinRuntimeYarnPath(manifest)
  const runtimePath = join(cwd, yarnPath)
  const yarnrcPath = join(cwd, YARNRC_PATH)
  const yarnrc = await readTextOrEmpty(yarnrcPath)

  await mkdir(dirname(runtimePath), { recursive: true })
  await writeFile(runtimePath, runtime)
  await writeFile(yarnrcPath, updateYarnPathConfiguration(yarnrc, yarnPath))

  return manifest
}

export const runYarnCommand: YarnCommandRunner = async (
  args: Array<string>,
  cwd: string
): Promise<void> => {
  const child = spawn('yarn', args, {
    cwd,
    env: createYarnCommandEnvironment(),
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', resolve)
  })

  if (exitCode !== 0) {
    throw new Error(`Command failed: yarn ${args.join(' ')}`)
  }
}

export const runRaijinInitializer = async ({
  argv = [],
  cwd = process.cwd(),
  fetchImpl = fetch,
  runYarnCommand: runCommand = runYarnCommand,
}: RunRaijinInitializerOptions = {}): Promise<void> => {
  const command = argv[0]

  if (argv.length > 1 || (command && command !== 'init')) {
    throw new Error('Usage: yarn init @atls/raijin or yarn dlx @atls/raijin init')
  }

  await installRaijinRuntime({ cwd, fetchImpl })
  await runCommand(['add', '-D', CODE_RUNTIME_PACKAGE], cwd)
  await runCommand(['generate', 'project'], cwd)
  await runCommand(['tools', 'sync'], cwd)
}
