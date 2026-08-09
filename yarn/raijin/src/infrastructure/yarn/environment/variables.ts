const DISCARDED_NAMES = new Set([
  'BERRY_BIN_FOLDER',
  'npm_config_user_agent',
  'npm_execpath',
  'npm_node_execpath',
  'YARN_IGNORE_PATH',
])
const DISCARDED_WINDOWS_NAMES = new Set(Array.from(DISCARDED_NAMES, (name) => name.toUpperCase()))
const CANONICAL_NAMES = ['INIT_CWD', 'NODE_OPTIONS', 'PATH', 'PROJECT_CWD', ...DISCARDED_NAMES]
const CANONICAL_WINDOWS_NAMES = new Map(CANONICAL_NAMES.map((name) => [name.toUpperCase(), name]))

export const createCanonicalNames = (
  additionalNames: ReadonlyArray<string> = []
): ReadonlyMap<string, string> =>
  new Map([...CANONICAL_NAMES, ...additionalNames].map((name) => [name.toUpperCase(), name]))

export const remove = (
  environment: NodeJS.ProcessEnv,
  name: string,
  platform: NodeJS.Platform = process.platform
): void => {
  const names =
    platform === 'win32'
      ? Object.keys(environment).filter(
          (environmentName) => environmentName.toUpperCase() === name.toUpperCase()
        )
      : [name]

  for (const environmentName of names) {
    Reflect.deleteProperty(environment, environmentName)
  }
}

export const get = (
  environment: NodeJS.ProcessEnv,
  name: string,
  platform: NodeJS.Platform = process.platform
): string | undefined => {
  if (platform !== 'win32') {
    return environment[name]
  }

  let value: string | undefined

  for (const [environmentName, environmentValue] of Object.entries(environment)) {
    if (environmentName.toUpperCase() === name.toUpperCase()) {
      value = environmentValue
    }
  }

  return value
}

export const isDiscarded = (name: string, platform: NodeJS.Platform = process.platform): boolean =>
  platform === 'win32' ? DISCARDED_WINDOWS_NAMES.has(name.toUpperCase()) : DISCARDED_NAMES.has(name)

export const discard = (
  environment: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform
): void => {
  for (const name of DISCARDED_NAMES) {
    remove(environment, name, platform)
  }
}

export const set = (
  environment: NodeJS.ProcessEnv,
  name: string,
  value: string | undefined,
  platform: NodeJS.Platform = process.platform,
  canonicalNames: ReadonlyMap<string, string> = CANONICAL_WINDOWS_NAMES
): void => {
  if (platform === 'win32') {
    remove(environment, name, platform)
  }

  environment[platform === 'win32' ? (canonicalNames.get(name.toUpperCase()) ?? name) : name] =
    value
}

export const merge = (
  environments: ReadonlyArray<NodeJS.ProcessEnv>,
  platform: NodeJS.Platform = process.platform,
  canonicalNames: ReadonlyMap<string, string> = CANONICAL_WINDOWS_NAMES
): NodeJS.ProcessEnv => {
  const result: NodeJS.ProcessEnv = {}

  for (const environment of environments) {
    for (const [name, value] of Object.entries(environment)) {
      set(result, name, value, platform, canonicalNames)
    }
  }

  return result
}
