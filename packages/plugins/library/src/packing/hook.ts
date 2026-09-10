import type { Workspace }         from '@yarnpkg/core'

import { access }                 from 'node:fs/promises'
import { isAbsolute }             from 'node:path'
import { relative }               from 'node:path'
import { resolve }                from 'node:path'

import { npath }                  from '@yarnpkg/fslib'

import { inspectLibraryArtifact } from '../build/artifact.js'
import { verifyLibraryArtifact }  from '../build/artifact.js'

interface PackManifest {
  // Yarn and npm allow nested conditional export objects with arbitrary condition names.
  exports?: Record<string, unknown>
  main?: string
  types?: string
  typings?: string
}

interface RaijinManifest {
  pack?: PackManifest
}

const LIBRARY_BUILD_SCRIPT = 'yarn library build'

export interface RawManifest {
  exports?: Record<string, unknown>
  main?: string
  types?: string
  typings?: string

  publishConfig?: PackManifest
  raijin?: RaijinManifest
}

const applyPackManifest = (rawManifest: RawManifest, packManifest?: PackManifest): void => {
  if (!packManifest) return

  if (packManifest.exports) rawManifest.exports = packManifest.exports
  if (packManifest.main) rawManifest.main = packManifest.main
  if (packManifest.types) rawManifest.types = packManifest.types
  if (packManifest.typings) rawManifest.typings = packManifest.typings
}

const collectPaths = (value: unknown): Array<string> => {
  if (typeof value === 'string') return [value]
  if (!value || typeof value !== 'object') return []

  return Object.values(value).flatMap(collectPaths)
}

const isArtifactPath = (path: string): boolean =>
  /\.(?:cjs|d\.cts|d\.mts|d\.ts|js|jsx|mjs)(?:\.map)?$/u.test(path)

const resolveArtifactRoot = (
  workspaceCwd: string,
  packManifest: PackManifest
): string | undefined => {
  const path = [packManifest.main, packManifest.types, packManifest.typings].find((
    entry
  ): entry is string => Boolean(entry && isArtifactPath(entry)))

  if (!path) return undefined

  const normalized = path.replace(/^\.\//u, '')

  if (isAbsolute(normalized) || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`Library pack path must stay inside its workspace: ${path}`)
  }

  return resolve(workspaceCwd, normalized.split('/')[0])
}

const verifyCompletedArtifact = async (
  workspaceCwd: string,
  packManifest: PackManifest
): Promise<void> => {
  const targetRoot = resolveArtifactRoot(workspaceCwd, packManifest)

  if (!targetRoot) return

  const artifact = await inspectLibraryArtifact(targetRoot)
  const issues = verifyLibraryArtifact(artifact, {
    declarationMaps: false,
    javascriptSourceMaps: false,
  })

  if (issues.length > 0) {
    throw new Error(`Library artifact is incomplete at ${targetRoot}: ${issues.join(', ')}`)
  }

  const referenced = [
    ...(packManifest.main ? [packManifest.main] : []),
    ...(packManifest.types ? [packManifest.types] : []),
    ...(packManifest.typings ? [packManifest.typings] : []),
    ...collectPaths(packManifest.exports),
  ].filter(isArtifactPath)

  await Promise.all(
    referenced.map(async (path) => {
      const file = resolve(workspaceCwd, path)
      const workspaceRelative = relative(workspaceCwd, file)

      if (
        workspaceRelative === '..' ||
        workspaceRelative.startsWith(`..${npath.sep}`) ||
        isAbsolute(workspaceRelative)
      ) {
        throw new Error(`Library pack path must stay inside its workspace: ${path}`)
      }

      await access(file)
    })
  )
}

const buildsLibraryArtifact = (workspace: Workspace): boolean =>
  [...workspace.manifest.scripts.values()].includes(LIBRARY_BUILD_SCRIPT)

export const beforeWorkspacePacking = async (
  workspace: Workspace,
  rawManifest: RawManifest
): Promise<void> => {
  const libraryArtifact = buildsLibraryArtifact(workspace)
  const packManifest =
    libraryArtifact || !workspace.manifest.private
      ? rawManifest.publishConfig
      : rawManifest.raijin?.pack

  if (libraryArtifact && packManifest)
    await verifyCompletedArtifact(npath.fromPortablePath(workspace.cwd), packManifest)

  applyPackManifest(rawManifest, packManifest)

  delete rawManifest.raijin
}
