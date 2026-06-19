import type { FetchLike }                         from './runtime-download.interfaces.js'
import type { RaijinRuntimeManifest }             from './runtime.interfaces.js'

import { RaijinRuntimeAssetDownloadException }    from './exceptions.js'
import { RaijinRuntimeManifestDownloadException } from './exceptions.js'
import { RAIJIN_RUNTIME_MANIFEST_URL }            from './runtime.js'
import { parseRaijinRuntimeManifest }             from './runtime.js'

const fetchJson = async (fetchImpl: FetchLike, url: string): Promise<unknown> => {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'raijin-initializer',
    },
  })

  if (!response.ok) {
    throw new RaijinRuntimeManifestDownloadException(response.status)
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
    throw new RaijinRuntimeAssetDownloadException(response.status)
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
