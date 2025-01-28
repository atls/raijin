import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import packageJson from '../package.json' with { type: 'json' }

const POSTFIX = '-atls'

/**
 * @param {Record<string, any>} packageJson
 * @param {string} postfix
 */
// eslint-disable-next-line @typescript-eslint/no-shadow
export const addPostfix = (packageJson, postfix = POSTFIX) => {
  if (!packageJson.version.endsWith(postfix)) {
    const initialVersion = packageJson.version
    // eslint-disable-next-line no-param-reassign
    packageJson.version = `${initialVersion}${postfix}`
  }

  return packageJson
}

/**
 * @param {Record<string, any>} packageJson
 * @param {string} postfix
 */
// eslint-disable-next-line @typescript-eslint/no-shadow
export const removePostfix = (packageJson, postfix = POSTFIX) => {
  if (packageJson.version.endsWith(postfix)) {
    const splitted = packageJson.version.split(postfix)
    // eslint-disable-next-line no-param-reassign
    // eslint-disable-next-line prefer-destructuring
    packageJson.version = splitted[0]
  }

  return packageJson
}

/**
 * @param {string} path
 * @param {Record<string,any>} data
 */
export const updatePackageJsonFile = (path, data) => {
  // eslint-disable-next-line n/no-sync
  writeFileSync(path, JSON.stringify(data, undefined, 2))
}

let modifiedPackageJson

if (packageJson.version.endsWith(POSTFIX)) {
  modifiedPackageJson = removePostfix(packageJson)
} else {
  modifiedPackageJson = addPostfix(packageJson)
}

updatePackageJsonFile(join('package.json'), modifiedPackageJson)
