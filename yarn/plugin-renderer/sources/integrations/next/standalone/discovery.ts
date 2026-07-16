import type { Filename }                       from '@yarnpkg/fslib'
import type { PortablePath }                   from '@yarnpkg/fslib'

import type { RendererArtifactSource }         from '../../../artifact/source.interfaces.js'
import type { NextStandaloneManifestSnapshot } from './discovery.interfaces.js'
import type { NextStandaloneManifestState }    from './discovery.interfaces.js'

import { npath }                               from '@yarnpkg/fslib'
import { ppath }                               from '@yarnpkg/fslib'
import { xfs }                                 from '@yarnpkg/fslib'

import { discoverFiles }                       from '@atls/raijin/filesystem'

const REQUIRED_SERVER_FILES_MANIFEST = 'required-server-files.json' as Filename
const STANDALONE_DIR = 'standalone' as Filename

interface NextRequiredServerFilesManifest {
  readonly appDir: string
  readonly relativeAppDir: string
  readonly config: {
    readonly output: 'standalone'
    readonly outputFileTracingRoot: string
  }
}

interface NextStandaloneManifestCandidate {
  readonly manifest: NextRequiredServerFilesManifest
  readonly path: PortablePath
}

const isRequiredServerFilesManifest = (
  value: unknown
): value is NextRequiredServerFilesManifest => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const manifest = value as Record<string, unknown>
  const { config } = manifest

  return (
    typeof manifest.appDir === 'string' &&
    manifest.appDir.length > 0 &&
    typeof manifest.relativeAppDir === 'string' &&
    manifest.relativeAppDir.length > 0 &&
    !!config &&
    typeof config === 'object' &&
    !Array.isArray(config) &&
    (config as Record<string, unknown>).output === 'standalone' &&
    typeof (config as Record<string, unknown>).outputFileTracingRoot === 'string' &&
    ((config as Record<string, unknown>).outputFileTracingRoot as string).length > 0
  )
}

const discoverManifestPaths = async (appCwd: PortablePath): Promise<Array<PortablePath>> =>
  discoverFiles({
    cwd: appCwd,
    patterns: [`**/${REQUIRED_SERVER_FILES_MANIFEST}`],
    ignore: ['**/standalone/**'],
    dot: true,
  })

const readManifestState = async (path: PortablePath): Promise<NextStandaloneManifestState> => {
  const { mtimeMs, size } = await xfs.statPromise(path)

  return { mtimeMs, size }
}

const hasManifestChanged = (
  previous: NextStandaloneManifestState | undefined,
  current: NextStandaloneManifestState
): boolean => !previous || previous.mtimeMs !== current.mtimeMs || previous.size !== current.size

export const snapshotNextStandaloneManifests = async (
  appCwd: PortablePath
): Promise<NextStandaloneManifestSnapshot> => {
  const paths = await discoverManifestPaths(appCwd)
  const entries = await Promise.all(
    paths.map(async (path) => [path, await readManifestState(path)] as const)
  )

  return new Map(entries)
}

export const resolveNextStandaloneArtifactSource = async (
  selectedAppCwd: PortablePath,
  snapshot: NextStandaloneManifestSnapshot
): Promise<RendererArtifactSource> => {
  const paths = await discoverManifestPaths(selectedAppCwd)
  const changedPaths = (
    await Promise.all(
      paths.map(async (path) => ({
        changed: hasManifestChanged(snapshot.get(path), await readManifestState(path)),
        path,
      }))
    )
  ).filter(({ changed }) => changed)
  const appCwd = await xfs.realpathPromise(selectedAppCwd)
  const manifests = (
    await Promise.all(
      changedPaths.map(async ({ path }): Promise<NextStandaloneManifestCandidate | undefined> => {
        const manifest = (await xfs.readJsonPromise(path)) as unknown

        if (!isRequiredServerFilesManifest(manifest)) {
          return undefined
        }

        const manifestAppPath = npath.toPortablePath(manifest.appDir)

        if (!ppath.isAbsolute(manifestAppPath)) {
          return undefined
        }

        const manifestAppCwd = await xfs.realpathPromise(manifestAppPath)

        return manifestAppCwd === appCwd ? { manifest, path } : undefined
      })
    )
  ).filter((candidate): candidate is NextStandaloneManifestCandidate => candidate !== undefined)

  if (manifests.length === 0) {
    throw new Error('Renderer build did not produce a current Next standalone manifest')
  }

  if (manifests.length > 1) {
    throw new Error('Renderer build produced multiple current Next standalone manifests')
  }

  const [{ manifest, path }] = manifests
  const nextOutputCwd = await xfs.realpathPromise(ppath.dirname(path))
  const manifestAppCwd = await xfs.realpathPromise(npath.toPortablePath(manifest.appDir))
  const tracingRootPath = npath.toPortablePath(manifest.config.outputFileTracingRoot)
  const appRelativeCwd = npath.toPortablePath(manifest.relativeAppDir)

  if (!ppath.isAbsolute(tracingRootPath) || ppath.isAbsolute(appRelativeCwd)) {
    throw new Error('Renderer build received inconsistent Next standalone manifest paths')
  }

  const tracingRoot = await xfs.realpathPromise(tracingRootPath)
  const reportedAppCwd = ppath.resolve(tracingRoot, appRelativeCwd)
  const canonicalAppRelativeCwd = ppath.relative(tracingRoot, manifestAppCwd)

  if (
    reportedAppCwd !== manifestAppCwd ||
    appRelativeCwd !== canonicalAppRelativeCwd ||
    ppath.contains(tracingRoot, manifestAppCwd) === null ||
    manifestAppCwd !== appCwd ||
    ppath.contains(appCwd, nextOutputCwd) === null
  ) {
    throw new Error('Renderer build received inconsistent Next standalone manifest paths')
  }

  const standaloneCwd = ppath.join(nextOutputCwd, STANDALONE_DIR)

  return {
    appCwd: selectedAppCwd,
    appRelativeCwd,
    nextOutputCwd,
    nextOutputRelativeCwd: ppath.relative(appCwd, nextOutputCwd),
    standaloneAppCwd: ppath.join(standaloneCwd, appRelativeCwd),
    standaloneCwd,
  }
}
