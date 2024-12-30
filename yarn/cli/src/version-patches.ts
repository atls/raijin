import { writeFileSync } from 'fs'

export const addPrefix = (packageJson: Record<string, any>, prefix = 'atls-') => {
  if (!packageJson.version.startsWith(prefix)) {
    const initialVersion = packageJson.version
    packageJson.version = `atls-${initialVersion}`
  }

  return packageJson
}

export const removePrefix = (packageJson: Record<string, any>, prefix = 'atls-') => {
  if (packageJson.version.startsWith(prefix)) {
    const splitted = packageJson.version.split(prefix)
    packageJson.version = splitted[1]
  }

  return packageJson
}

export const updatePackageJsonFile = (path: string, data: Record<string, any>) => {
  writeFileSync(path, JSON.stringify(data, undefined, 2))
}
