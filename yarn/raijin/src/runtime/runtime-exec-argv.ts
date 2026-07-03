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
const PNP_ESM_NODE_OPTION = /(?:^|[\\/])\.pnp\.loader\.mjs$/
const TYPESCRIPT_LOADER_NODE_OPTION =
  /(?:^@atls\/raijin\/typescript-loader$|[\\/]typescript-loader\.(?:js|mjs)$)/
const NODE_OPTIONS_WITH_VALUE = new Set(['--experimental-loader', '--loader'])

const require = createRequire(import.meta.url)
const materializedTypeScriptLoaders = new Map<string, Promise<string>>()

type NodeOptionToken = {
  raw: string
  value: string
}

type RuntimeEnvironmentOptions = {
  preservePnpEsmLoader?: boolean
}

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

const isPnPEsmNodeOptionValue = (value: string): boolean => PNP_ESM_NODE_OPTION.test(value)

const isTypeScriptLoaderNodeOptionValue = (value: string): boolean =>
  TYPESCRIPT_LOADER_NODE_OPTION.test(value)

const splitNodeOptions = (nodeOptions: string): Array<NodeOptionToken> => {
  const tokens: Array<NodeOptionToken> = []
  let raw = ''
  let value = ''
  let quote: string | undefined

  for (let index = 0; index < nodeOptions.length; index += 1) {
    const char = nodeOptions[index]

    if (quote) {
      raw += char

      if (char === '\\' && nodeOptions[index + 1] === quote) {
        index += 1
        raw += nodeOptions[index]
        value += nodeOptions[index]
        continue
      }

      if (char === quote) {
        quote = undefined
        continue
      }

      value += char
      continue
    }

    if (char === '"' || char === "'") {
      raw += char
      quote = char
      continue
    }

    if (/\s/.test(char)) {
      if (raw) {
        tokens.push({ raw, value })
        raw = ''
        value = ''
      }

      continue
    }

    raw += char
    value += char
  }

  if (raw) {
    tokens.push({ raw, value })
  }

  return tokens
}

const removeRuntimeLoaderNodeOptions = (
  nodeOptions: string,
  { preservePnpEsmLoader = false }: RuntimeEnvironmentOptions = {}
): string => {
  const options = splitNodeOptions(nodeOptions)
  const filtered: Array<string> = []

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index]
    const [name, value] = option.value.split('=', 2)

    if (
      value &&
      NODE_OPTIONS_WITH_VALUE.has(name) &&
      (isTypeScriptLoaderNodeOptionValue(value) ||
        (!preservePnpEsmLoader && isPnPEsmNodeOptionValue(value)))
    ) {
      continue
    }

    if (NODE_OPTIONS_WITH_VALUE.has(option.value)) {
      const next = options.at(index + 1)

      if (
        next &&
        (isTypeScriptLoaderNodeOptionValue(next.value) ||
          (!preservePnpEsmLoader && isPnPEsmNodeOptionValue(next.value)))
      ) {
        index += 1
        continue
      }
    }

    filtered.push(option.raw)
  }

  return filtered.join(' ')
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

export const createRuntimeEnvironment = (
  environment: NodeJS.ProcessEnv = process.env,
  options: RuntimeEnvironmentOptions = {}
): NodeJS.ProcessEnv => {
  const runtimeEnvironment = { ...environment }
  const nodeOptions = runtimeEnvironment.NODE_OPTIONS

  if (!nodeOptions) {
    return runtimeEnvironment
  }

  const sanitizedNodeOptions = removeRuntimeLoaderNodeOptions(nodeOptions, options)

  if (sanitizedNodeOptions) {
    runtimeEnvironment.NODE_OPTIONS = sanitizedNodeOptions
  } else {
    delete runtimeEnvironment.NODE_OPTIONS
  }

  return runtimeEnvironment
}
