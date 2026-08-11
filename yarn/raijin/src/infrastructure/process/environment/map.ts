const PROCESS_NAMES = ['INIT_CWD', 'NODE_OPTIONS', 'PATH', 'PROJECT_CWD']

export const createNames = (
  additionalNames: ReadonlyArray<string> = []
): ReadonlyMap<string, string> =>
  new Map([...PROCESS_NAMES, ...additionalNames].map((name) => [name.toUpperCase(), name]))

const CANONICAL_NAMES = createNames()

export const includesName = (
  names: ReadonlyArray<string>,
  name: string,
  platform: NodeJS.Platform = process.platform
): boolean =>
  names.some((candidate) =>
    platform === 'win32' ? candidate.toUpperCase() === name.toUpperCase() : candidate === name)

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

export const set = (
  environment: NodeJS.ProcessEnv,
  name: string,
  value: string | undefined,
  platform: NodeJS.Platform = process.platform,
  canonicalNames: ReadonlyMap<string, string> = CANONICAL_NAMES
): void => {
  if (platform === 'win32') {
    remove(environment, name, platform)
  }

  environment[platform === 'win32' ? (canonicalNames.get(name.toUpperCase()) ?? name) : name] =
    value
}

export const applyPatch = (
  environment: NodeJS.ProcessEnv,
  patch: Readonly<NodeJS.ProcessEnv>,
  platform: NodeJS.Platform = process.platform,
  canonicalNames: ReadonlyMap<string, string> = CANONICAL_NAMES
): void => {
  for (const [name, value] of Object.entries(patch)) {
    if (value === undefined) {
      remove(environment, name, platform)
    } else {
      set(environment, name, value, platform, canonicalNames)
    }
  }
}

export const merge = (
  environments: ReadonlyArray<NodeJS.ProcessEnv>,
  platform: NodeJS.Platform = process.platform,
  canonicalNames: ReadonlyMap<string, string> = CANONICAL_NAMES
): NodeJS.ProcessEnv => {
  const result: NodeJS.ProcessEnv = {}

  for (const environment of environments) {
    for (const [name, value] of Object.entries(environment)) {
      set(result, name, value, platform, canonicalNames)
    }
  }

  return result
}
