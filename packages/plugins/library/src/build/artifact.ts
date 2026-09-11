import { readdir } from 'node:fs/promises'
import { join }    from 'node:path'

type NodeError = Error & { code?: string }

export interface LibraryArtifact {
  readonly declarations: ReadonlyArray<string>
  readonly javascript: ReadonlyArray<string>
  readonly sourceMaps: ReadonlyArray<string>
  readonly targetRoot: string
}

export type LibraryArtifactIssue =
  | 'declaration-source-maps-missing'
  | 'declarations-missing'
  | 'emit-skipped'
  | 'javascript-missing'
  | 'javascript-source-maps-missing'

export interface LibraryArtifactExpectations {
  readonly declarationMaps: boolean
  readonly javascriptSourceMaps: boolean
}

const collectFiles = async (directory: string): Promise<Array<string>> => {
  const files: Array<string> = []

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
}

const isDeclaration = (path: string): boolean => /\.d\.(?:cts|mts|ts)$/u.test(path)
const isJavaScript = (path: string): boolean => /\.(?:cjs|js|jsx|mjs)$/u.test(path)
const isSourceMap = (path: string): boolean => /\.map$/u.test(path)
const isDeclarationMap = (path: string): boolean => /\.d\.(?:cts|mts|ts)\.map$/u.test(path)
const isJavaScriptMap = (path: string): boolean => /\.(?:cjs|js|jsx|mjs)\.map$/u.test(path)

const isMissing = (error: unknown): error is NodeError =>
  error instanceof Error && (error as NodeError).code === 'ENOENT'

export const inspectLibraryArtifact = async (targetRoot: string): Promise<LibraryArtifact> => {
  let files: Array<string>

  try {
    files = (await collectFiles(targetRoot)).sort()
  } catch (error) {
    if (!isMissing(error)) throw error

    files = []
  }

  return {
    declarations: files.filter(isDeclaration),
    javascript: files.filter(isJavaScript),
    sourceMaps: files.filter(isSourceMap),
    targetRoot,
  }
}

export const verifyLibraryArtifact = (
  artifact: LibraryArtifact,
  expectations: LibraryArtifactExpectations
): ReadonlyArray<LibraryArtifactIssue> => {
  const issues: Array<LibraryArtifactIssue> = []

  if (artifact.javascript.length === 0) issues.push('javascript-missing')
  if (artifact.declarations.length === 0) issues.push('declarations-missing')
  if (expectations.javascriptSourceMaps && !artifact.sourceMaps.some(isJavaScriptMap)) {
    issues.push('javascript-source-maps-missing')
  }
  if (expectations.declarationMaps && !artifact.sourceMaps.some(isDeclarationMap)) {
    issues.push('declaration-source-maps-missing')
  }

  return issues
}
