import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { join } from 'node:path'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '../../..')
const packageJsonPath = join(root, 'yarn/cli/package.json')
const bundlePath = join(root, 'yarn/cli/dist/runtime/yarn.mjs')
const manifestPath = join(root, '.yarn/releases/raijin-runtime.json')
const assetName = 'yarn.mjs'
const packageName = '@atls/yarn-cli'

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
const bundle = await readFile(bundlePath)
const { version } = packageJson
const tagName = `${packageName}@${version}`
const sha256 = createHash('sha256').update(bundle).digest('hex')
const releaseApiUrl = `https://api.github.com/repos/atls/raijin/releases/tags/${encodeURIComponent(
  tagName
)}`

const resolveRuntimeAssetUrl = async () => {
  if (process.env.RAIJIN_RUNTIME_ASSET_URL) {
    return process.env.RAIJIN_RUNTIME_ASSET_URL
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN

  if (!token) {
    throw new Error('GITHUB_TOKEN is required to resolve the Raijin runtime release asset URL')
  }

  const response = await fetch(releaseApiUrl, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'raijin-yarn-runtime-manifest',
      'x-github-api-version': '2022-11-28',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to resolve Raijin runtime release asset URL: HTTP ${response.status}`)
  }

  const release = await response.json()
  const asset = release.assets?.find((candidate) => candidate.name === assetName)
  const assetUrl = asset?.browser_download_url

  if (typeof assetUrl !== 'string' || assetUrl.length === 0) {
    throw new Error(`Missing Raijin runtime release asset ${assetName}`)
  }

  return assetUrl
}

const manifest = {
  schemaVersion: 1,
  packageName,
  version,
  tagName,
  assetName,
  assetUrl: await resolveRuntimeAssetUrl(),
  sha256,
}

await mkdir(dirname(manifestPath), { recursive: true })
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
