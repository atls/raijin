import type { ArtifactFile }       from './materialize.interfaces.js'
import type { MaterializeOptions } from './materialize.interfaces.js'

import { createHash }              from 'node:crypto'
import { access }                  from 'node:fs/promises'
import { mkdir }                   from 'node:fs/promises'
import { mkdtemp }                 from 'node:fs/promises'
import { readFile }                from 'node:fs/promises'
import { rename }                  from 'node:fs/promises'
import { rm }                      from 'node:fs/promises'
import { writeFile }               from 'node:fs/promises'
import { tmpdir }                  from 'node:os'
import { dirname }                 from 'node:path'
import { join }                    from 'node:path'
import { pathToFileURL }           from 'node:url'

import ts                          from 'typescript'

const CACHE_DIRECTORY = 'raijin-typescript-loader'
const COMPILER_OPTIONS_IMPORT = '../config/typescript/compiler-options/compiler-options.js'
const COMPILER_OPTIONS_OUTPUT_PATH = 'config/typescript/compiler-options/compiler-options.js'
const COMPILER_OPTIONS_SOURCE_PATH = 'src/config/typescript/compiler-options/compiler-options.ts'
const LOADER_OUTPUT_PATH = 'runtime/typescript-loader.mjs'
const LOADER_RUNTIME_REQUIRE = 'createRequire(import.meta.url)'
const LOADER_SOURCE_PATH = 'src/runtime/typescript-loader.ts'
const PACKAGE_MANIFEST_PATH = 'package.json'
const PACKAGE_MANIFEST_SOURCE = JSON.stringify({ type: 'module' })

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

const transpileTypeScriptSource = (source: string, sourcePath: string): string => {
  const { outputText } = ts.transpileModule(source, {
    fileName: sourcePath,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.ESNext,
      sourceMap: false,
      target: ts.ScriptTarget.ES2022,
    },
  })

  return outputText
}

const createArtifactFiles = async (
  packagePath: string,
  sourcePath: string
): Promise<Array<ArtifactFile>> => {
  const loaderSource = await readFile(sourcePath, 'utf8')
  const files: Array<ArtifactFile> = [
    {
      path: PACKAGE_MANIFEST_PATH,
      source: PACKAGE_MANIFEST_SOURCE,
    },
  ]

  if (loaderSource.includes(COMPILER_OPTIONS_IMPORT)) {
    const compilerOptionsSourcePath = join(dirname(packagePath), COMPILER_OPTIONS_SOURCE_PATH)
    const compilerOptionsSource = await readFile(compilerOptionsSourcePath, 'utf8')

    files.push({
      path: COMPILER_OPTIONS_OUTPUT_PATH,
      source: transpileTypeScriptSource(compilerOptionsSource, COMPILER_OPTIONS_SOURCE_PATH),
    })
  }

  files.push({
    path: LOADER_OUTPUT_PATH,
    source: transpileTypeScriptSource(loaderSource, LOADER_SOURCE_PATH).replace(
      LOADER_RUNTIME_REQUIRE,
      `createRequire(${JSON.stringify(pathToFileURL(packagePath).href)})`
    ),
  })

  return files
}

const createArtifactDigest = (files: Array<ArtifactFile>): string =>
  createHash('sha256').update(JSON.stringify(files)).digest('hex')

const matchesArtifact = async (
  artifactPath: string,
  files: Array<ArtifactFile>
): Promise<boolean> => {
  if (!(await fileExists(artifactPath))) {
    return false
  }

  const matches = await Promise.all(
    files.map(async (file) => {
      try {
        return (await readFile(join(artifactPath, file.path), 'utf8')) === file.source
      } catch {
        return false
      }
    })
  )

  return matches.every(Boolean)
}

const writeArtifact = async (artifactPath: string, files: Array<ArtifactFile>): Promise<void> => {
  await Promise.all(
    files.map(async (file) => {
      const outputPath = join(artifactPath, file.path)

      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, file.source, 'utf8')
    })
  )
}

export const materializeTypeScriptLoaderArtifact = async ({
  cachePath = join(tmpdir(), CACHE_DIRECTORY),
  packagePath,
  sourcePath,
}: MaterializeOptions): Promise<string> => {
  const files = await createArtifactFiles(packagePath, sourcePath)
  const artifactPath = join(cachePath, createArtifactDigest(files))
  const loaderPath = join(artifactPath, LOADER_OUTPUT_PATH)

  if (await matchesArtifact(artifactPath, files)) {
    return pathToFileURL(loaderPath).href
  }

  await mkdir(cachePath, { recursive: true })

  const temporaryArtifactPath = await mkdtemp(join(cachePath, '.materialize-'))

  try {
    await writeArtifact(temporaryArtifactPath, files)

    try {
      await rename(temporaryArtifactPath, artifactPath)
    } catch (error) {
      if (!(await matchesArtifact(artifactPath, files))) {
        throw error
      }
    }
  } finally {
    await rm(temporaryArtifactPath, { recursive: true, force: true })
  }

  return pathToFileURL(loaderPath).href
}
