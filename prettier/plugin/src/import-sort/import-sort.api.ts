import type { IImport } from 'import-sort-parser'

import { readFileSync } from 'node:fs'
import { join }         from 'node:path'

import { globbySync }   from 'globby'

const loadWorkspaces = (): Array<string> => {
  const exists = new Set<string>()

  try {
    const { workspaces }: { workspaces: Array<string> } = JSON.parse(
      readFileSync(join(process.cwd(), '/package.json'), 'utf-8')
    )

    if (workspaces?.length > 0) {
      const folders = globbySync(workspaces, {
        cwd: process.cwd(),
        onlyDirectories: true,
        absolute: true,
        expandDirectories: {
          files: ['package.json'],
          extensions: ['json'],
        },
      })

      folders.forEach((folder) => {
        try {
          const { name }: { name: string } = JSON.parse(
            readFileSync(join(folder, 'package.json'), 'utf-8')
          )

          if (name.startsWith('@')) {
            exists.add(name)
          }
        } catch (error) {} // eslint-disable-line
      })
    }
  } catch (error) {
    console.log(error) // eslint-disable-line
  }

  return Array.from(exists)
}

const workspaces = loadWorkspaces()

export const isWorkspaceModule = (imported: IImport): boolean =>
  workspaces.some((workspace) => imported.moduleName.startsWith(workspace))

export const isNodeModule = (imported: IImport): boolean => imported.moduleName.startsWith('node:')

export const isImportType = (imported: IImport): boolean => imported.type === 'import-type'
