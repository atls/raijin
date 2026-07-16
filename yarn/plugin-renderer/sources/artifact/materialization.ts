import type { Filename }                       from '@yarnpkg/fslib'

import type { RendererArtifactLayout }         from './layout.interfaces.js'

import { ppath }                               from '@yarnpkg/fslib'
import { xfs }                                 from '@yarnpkg/fslib'

import { RENDERER_STANDALONE_SERVER_FILENAME } from './entrypoint.js'

const EDGE_CHUNKS_CWD = 'server/edge-chunks'
const PUBLIC_DIR = 'public' as Filename
const STATIC_DIR = 'static' as Filename

export const assertArtifactSource = async ({
  standaloneAppCwd,
  standaloneCwd,
}: RendererArtifactLayout): Promise<void> => {
  if (
    (await xfs.existsPromise(standaloneCwd)) &&
    (await xfs.existsPromise(ppath.join(standaloneAppCwd, RENDERER_STANDALONE_SERVER_FILENAME)))
  ) {
    return
  }

  throw new Error('Renderer build metadata does not reference a runnable Next standalone server')
}

export const copyStandalone = async ({
  distCwd,
  standaloneCwd,
}: RendererArtifactLayout): Promise<void> => {
  await xfs.copyPromise(distCwd, standaloneCwd)
}

export const copyStaticAssets = async ({
  artifactNextOutputCwd,
  nextOutputCwd,
}: RendererArtifactLayout): Promise<void> => {
  await xfs.copyPromise(
    ppath.join(artifactNextOutputCwd, STATIC_DIR),
    ppath.join(nextOutputCwd, STATIC_DIR)
  )
}

export const copyEdgeChunks = async ({
  artifactNextOutputCwd,
  nextOutputCwd,
}: RendererArtifactLayout): Promise<void> => {
  const edgeChunksCwd = ppath.join(nextOutputCwd, EDGE_CHUNKS_CWD)

  if (await xfs.existsPromise(edgeChunksCwd)) {
    await xfs.copyPromise(ppath.join(artifactNextOutputCwd, EDGE_CHUNKS_CWD), edgeChunksCwd)
  }
}

export const copyPublicAssets = async ({
  appCwd,
  artifactAppCwd,
  rendererCwd,
}: RendererArtifactLayout): Promise<void> => {
  const appPublicCwd = ppath.join(appCwd, PUBLIC_DIR)
  const rootPublicCwd = ppath.join(rendererCwd, PUBLIC_DIR)
  const source = (await xfs.existsPromise(appPublicCwd)) ? appPublicCwd : rootPublicCwd

  if (await xfs.existsPromise(source)) {
    await xfs.copyPromise(ppath.join(artifactAppCwd, PUBLIC_DIR), source)
  }
}
