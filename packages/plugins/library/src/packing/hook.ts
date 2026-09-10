import type { Workspace }         from '@yarnpkg/core'
import type { Argument }          from '@yarnpkg/parsers'

import { access }                 from 'node:fs/promises'
import { isAbsolute }             from 'node:path'
import { relative }               from 'node:path'
import { resolve }                from 'node:path'

import { npath }                  from '@yarnpkg/fslib'
import { parseShell }             from '@yarnpkg/parsers'

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

const isJavaScriptArtifactPath = (path: string): boolean =>
  /\.(?:cjs|js|jsx|mjs)(?:\.map)?$/u.test(path)

const collectArtifactPaths = (packManifest: PackManifest): Array<string> =>
  [
    ...(packManifest.main ? [packManifest.main] : []),
    ...(packManifest.types ? [packManifest.types] : []),
    ...(packManifest.typings ? [packManifest.typings] : []),
    ...collectPaths(packManifest.exports),
  ].filter(isArtifactPath)

const resolveArtifactRoot = (
  workspaceCwd: string,
  referenced: Array<string>
): string | undefined => {
  const path = referenced.find(isJavaScriptArtifactPath) ?? referenced[0]

  if (!path) return undefined

  const normalized = path.replace(/^\.\//u, '')

  if (isAbsolute(normalized) || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`Library pack path must stay inside its workspace: ${path}`)
  }

  const [topLevel] = normalized.split('/')

  return topLevel === normalized ? workspaceCwd : resolve(workspaceCwd, topLevel)
}

const verifyCompletedArtifact = async (
  workspaceCwd: string,
  packManifest: PackManifest
): Promise<void> => {
  const referenced = collectArtifactPaths(packManifest)
  const targetRoot = resolveArtifactRoot(workspaceCwd, referenced)

  if (targetRoot) {
    const artifact = await inspectLibraryArtifact(targetRoot)
    const issues = verifyLibraryArtifact(artifact, {
      declarationMaps: false,
      javascriptSourceMaps: false,
    })

    if (issues.length > 0) {
      throw new Error(`Library artifact is incomplete at ${targetRoot}: ${issues.join(', ')}`)
    }
  }

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

const literalArgument = (argument: Argument): string | undefined => {
  if (argument.type !== 'argument' || argument.segments.some(({ type }) => type !== 'text'))
    return undefined

  return argument.segments.map((segment) => (segment.type === 'text' ? segment.text : '')).join('')
}

const isLibraryBuildScript = (script: string): boolean => {
  try {
    const shell = parseShell(script)

    if (shell.length !== 1 || shell[0]?.type !== ';') return false

    const commandLine = shell[0].command
    const command = commandLine.chain

    if (commandLine.then || command.then || command.type !== 'command') return false

    const [binary, namespace, action] = command.args.map(literalArgument)

    return binary === 'yarn' && namespace === 'library' && action === 'build'
  } catch {
    return false
  }
}

const buildsLibraryArtifact = (workspace: Workspace): boolean =>
  [...workspace.manifest.scripts.values()].some(isLibraryBuildScript)

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
