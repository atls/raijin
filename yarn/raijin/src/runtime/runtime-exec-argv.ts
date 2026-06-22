import { access }        from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { readFile }      from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir }        from 'node:os'
import { dirname }       from 'node:path'
import { join }          from 'node:path'
import { resolve }       from 'node:path'
import { pathToFileURL } from 'node:url'

import ts                from 'typescript'

const PNP_ESM_LOADER_FILENAME = '.pnp.loader.mjs'
const RAIJIN_PACKAGE_JSON = '@atls/raijin/package.json'
const TYPESCRIPT_LOADER_DIST_PATH = 'dist/runtime/typescript-loader.js'
const TYPESCRIPT_LOADER_SOURCE_PATH = 'src/runtime/typescript-loader.ts'
const TYPESCRIPT_LOADER_RUNTIME_REQUIRE = 'createRequire(import.meta.url)'
const TYPESCRIPT_LOADER_SPECIFIER = '@atls/raijin/typescript-loader'

const require = createRequire(import.meta.url)
const materializedTypeScriptLoaders = new Map<string, Promise<string>>()

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

const getPnpEsmLoaderPaths = (cwd: string): Array<string> => {
  let current = resolve(cwd)
  const paths: Array<string> = []

  while (current !== dirname(current)) {
    paths.push(join(current, PNP_ESM_LOADER_FILENAME))
    current = dirname(current)
  }

  return paths
}

export const findPnpEsmLoader = async (cwd: string): Promise<string | undefined> => {
  const pnpEsmLoaderPaths = await Promise.all(
    getPnpEsmLoaderPaths(cwd).map(async (path) => ((await fileExists(path)) ? path : undefined))
  )
  const pnpEsmLoaderPath = pnpEsmLoaderPaths.find(Boolean)

  return pnpEsmLoaderPath ? pathToFileURL(pnpEsmLoaderPath).href : undefined
}

const transpileTypeScriptLoader = (source: string, raijinPackagePath: string): string => {
  const { outputText } = ts.transpileModule(source, {
    fileName: TYPESCRIPT_LOADER_SOURCE_PATH,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.ESNext,
      sourceMap: false,
      target: ts.ScriptTarget.ES2022,
    },
  })

  return outputText.replace(
    TYPESCRIPT_LOADER_RUNTIME_REQUIRE,
    `createRequire(${JSON.stringify(pathToFileURL(raijinPackagePath).href)})`
  )
}

const materializeTypeScriptLoader = async (
  raijinPackagePath: string,
  typeScriptLoaderSourcePath: string
): Promise<string> => {
  const outputPath = join(
    await mkdtemp(join(tmpdir(), 'raijin-typescript-loader-')),
    'typescript-loader.mjs'
  )
  const source = await readFile(typeScriptLoaderSourcePath, 'utf8')

  await writeFile(outputPath, transpileTypeScriptLoader(source, raijinPackagePath), 'utf8')

  return pathToFileURL(outputPath).href
}

const getMaterializedTypeScriptLoader = async (
  raijinPackagePath: string,
  typeScriptLoaderSourcePath: string
): Promise<string> => {
  const key = `${raijinPackagePath}:${typeScriptLoaderSourcePath}`
  const materializedTypeScriptLoader = materializedTypeScriptLoaders.get(key)

  if (materializedTypeScriptLoader) {
    return materializedTypeScriptLoader
  }

  const nextMaterializedTypeScriptLoader = materializeTypeScriptLoader(
    raijinPackagePath,
    typeScriptLoaderSourcePath
  )

  materializedTypeScriptLoaders.set(key, nextMaterializedTypeScriptLoader)

  return nextMaterializedTypeScriptLoader
}

const resolveRaijinPackagePath = (): string => require.resolve(RAIJIN_PACKAGE_JSON)

export const resolveTypeScriptLoader = async (
  raijinPackagePath = resolveRaijinPackagePath()
): Promise<string> => {
  const raijinPath = dirname(raijinPackagePath)
  const typeScriptLoaderPath = join(raijinPath, TYPESCRIPT_LOADER_DIST_PATH)

  if (await fileExists(typeScriptLoaderPath)) {
    return pathToFileURL(typeScriptLoaderPath).href
  }

  const typeScriptLoaderSourcePath = join(raijinPath, TYPESCRIPT_LOADER_SOURCE_PATH)

  if (await fileExists(typeScriptLoaderSourcePath)) {
    return getMaterializedTypeScriptLoader(raijinPackagePath, typeScriptLoaderSourcePath)
  }

  throw new Error(`Unable to resolve loadable TypeScript loader for ${RAIJIN_PACKAGE_JSON}`)
}

export const createTypeScriptRuntimeExecArgv = (
  pnpEsmLoader?: string,
  typeScriptLoader = TYPESCRIPT_LOADER_SPECIFIER
): Array<string> => {
  const execArgv: Array<string> = []

  if (pnpEsmLoader) {
    execArgv.push('--loader', pnpEsmLoader)
  }

  execArgv.push('--loader', typeScriptLoader)
  execArgv.push('--enable-source-maps')

  return execArgv
}

export const createRuntimeExecArgv = async (cwd: string): Promise<Array<string>> => {
  const [pnpEsmLoader, typeScriptLoader] = await Promise.all([
    findPnpEsmLoader(cwd),
    resolveTypeScriptLoader(),
  ])

  return createTypeScriptRuntimeExecArgv(pnpEsmLoader, typeScriptLoader)
}
