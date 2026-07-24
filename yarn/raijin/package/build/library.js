// @ts-check

import { readdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { join } from 'node:path'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * @param {string} directory
 * @param {Array<string>} files
 * @returns {Promise<Array<string>>}
 */
const collectSourceFiles = async (directory, files = []) => {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      await collectSourceFiles(path, files)
    } else if (entry.isFile() && path.endsWith('.ts') && !path.endsWith('.test.ts')) {
      files.push(path)
    }
  }

  return files
}

/**
 * @param {string} root
 * @returns {ts.FormatDiagnosticsHost}
 */
const createDiagnosticHost = (root) => ({
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => root,
  getNewLine: () => ts.sys.newLine,
})

/**
 * @param {Array<ts.Diagnostic>} diagnostics
 * @param {string} root
 */
const reportDiagnostics = (diagnostics, root) => {
  if (diagnostics.length === 0) {
    return
  }

  process.stderr.write(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, createDiagnosticHost(root))
  )
}

/**
 * @param {{ packageRoot?: string }} [options]
 * @returns {Promise<void>}
 */
export const buildLibraryArtifact = async ({ packageRoot: root = packageRoot } = {}) => {
  const rootSource = join(root, 'src')
  const rootTarget = join(root, 'dist')
  const rootRepo = resolve(root, '../..')
  const configPath = join(rootRepo, 'tsconfig.json')
  const config = ts.readConfigFile(configPath, ts.sys.readFile)

  if (config.error) {
    reportDiagnostics([config.error], root)
    throw new Error('Cannot read TypeScript configuration')
  }

  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    rootRepo,
    {
      declaration: true,
      noEmit: false,
      outDir: rootTarget,
      rootDir: rootSource,
      skipLibCheck: true,
    },
    configPath
  )
  const sourceFiles = await collectSourceFiles(rootSource)
  const program = ts.createProgram({
    rootNames: sourceFiles,
    options: parsed.options,
    projectReferences: parsed.projectReferences,
  })
  const emit = program.emit()
  const diagnostics = ts.getPreEmitDiagnostics(program).concat(emit.diagnostics)

  reportDiagnostics(diagnostics, root)

  if (diagnostics.length > 0) {
    throw new Error('Library artifact build failed')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildLibraryArtifact()
}
