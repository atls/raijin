import type { IImport } from 'import-sort-parser'

export const createWorkspaceModuleMatcher = (workspacePackageNames: ReadonlyArray<string>) =>
  (imported: IImport): boolean =>
    workspacePackageNames.some(
      (workspace) =>
        imported.moduleName === workspace || imported.moduleName.startsWith(`${workspace}/`)
    )

export const isNodeModule = (imported: IImport): boolean => imported.moduleName.startsWith('node:')

export const isImportType = (imported: IImport): boolean => imported.type === 'import-type'
