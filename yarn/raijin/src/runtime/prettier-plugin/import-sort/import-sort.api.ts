import type { IImport } from 'import-sort-parser'

import { readFileSync } from 'node:fs'
import { dirname }      from 'node:path'
import { join }         from 'node:path'

import { globbySync }   from 'globby'

interface WorkspacePackageManifest {
  name?: string
  workspaces?:
    | Array<string>
    | {
        packages?: Array<string>
      }
}

const readPackageManifest = (cwd: string): WorkspacePackageManifest | null => {
  try {
    return JSON.parse(
      // eslint-disable-next-line n/no-sync
      readFileSync(join(cwd, 'package.json'), 'utf-8')
    ) as WorkspacePackageManifest
  } catch {
    return null
  }
}

const getWorkspacePatterns = (
  workspaces: WorkspacePackageManifest['workspaces']
): Array<string> => {
  if (Array.isArray(workspaces)) {
    return workspaces
  }

  if (Array.isArray(workspaces?.packages)) {
    return workspaces.packages
  }

  return []
}

export const resolveWorkspaceRoot = (cwd: string = process.cwd()): string | null => {
  let current = cwd

  while (true) {
    const manifest = readPackageManifest(current)

    if (getWorkspacePatterns(manifest?.workspaces).length > 0) {
      return current
    }

    const parent = dirname(current)

    if (parent === current) {
      return null
    }

    current = parent
  }
}

export const resolveWorkspacePackageNames = (cwd: string = process.cwd()): Array<string> => {
  const workspaceRoot = resolveWorkspaceRoot(cwd)
  const exists = new Set<string>()

  if (!workspaceRoot) {
    return []
  }

  const manifest = readPackageManifest(workspaceRoot)
  const workspaces = getWorkspacePatterns(manifest?.workspaces)

  // eslint-disable-next-line n/no-sync
  const folders = globbySync(workspaces, {
    cwd: workspaceRoot,
    onlyDirectories: true,
    absolute: true,
    expandDirectories: {
      files: ['package.json'],
      extensions: ['json'],
    },
  })

  folders.forEach((folder) => {
    const workspaceManifest = readPackageManifest(folder)

    if (workspaceManifest?.name?.startsWith('@')) {
      exists.add(workspaceManifest.name)
    }
  })

  return Array.from(exists)
}

const workspaces = resolveWorkspacePackageNames()

export const isWorkspaceModule = (imported: IImport): boolean =>
  workspaces.some((workspace) => imported.moduleName.startsWith(workspace))

export const isNodeModule = (imported: IImport): boolean => imported.moduleName.startsWith('node:')

export const isImportType = (imported: IImport): boolean => imported.type === 'import-type'
