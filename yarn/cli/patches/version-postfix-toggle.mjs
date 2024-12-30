import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import packageJson from '../package.json' with { type: 'json' }

const POSTFIX = '-atls'

/**
 * @param {Record<string, any>} packageJson
 * @param {string} postfix
 */
export const addPostfix = (packageJson, postfix = POSTFIX) => {
  if (!packageJson.version.endsWith(postfix)) {
    const initialVersion = packageJson.version
    packageJson.version = `${initialVersion}${postfix}`
  }

  return packageJson
}

/**
 * @param {Record<string, any>} packageJson
 * @param {string} postfix
 */
export const removePostfix = (packageJson, postfix = POSTFIX) => {
  if (packageJson.version.endsWith(postfix)) {
    const splitted = packageJson.version.split(postfix)
    packageJson.version = splitted[0]
  }

  return packageJson
}

/**
 * @param {string} path
 * @param {Record<string,any>} data
 */
export const updatePackageJsonFile = (path, data) => {
  writeFileSync(path, JSON.stringify(data, undefined, 2))
}

let modifiedPackageJson

if (packageJson.version.endsWith(POSTFIX)) {
  modifiedPackageJson = removePostfix(packageJson)
} else {
  modifiedPackageJson = addPostfix(packageJson)
}

updatePackageJsonFile(join('package.json'), modifiedPackageJson)
