import type { RaijinRuntimeManifest }  from './runtime.js'

import { RAIJIN_RUNTIME_MANIFEST_URL } from './runtime.js'
import { parseRaijinRuntimeManifest }  from './runtime.js'

export type FetchLike = typeof fetch

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

export const fetchRaijinRuntimeManifest = async (
  fetchImpl: FetchLike
): Promise<RaijinRuntimeManifest> =>
  parseRaijinRuntimeManifest(await fetchJson(fetchImpl, RAIJIN_RUNTIME_MANIFEST_URL))

export const downloadRaijinRuntime = async (
  fetchImpl: FetchLike,
  manifest: RaijinRuntimeManifest
): Promise<Buffer> => fetchBuffer(fetchImpl, manifest.assetUrl)
