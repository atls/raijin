import { createHash } from 'node:crypto'

export const RAIJIN_RUNTIME_PACKAGE_NAME = '@atls/raijin'
export const RAIJIN_RUNTIME_ASSET_NAME = 'yarn.js'
export const RAIJIN_RUNTIME_YARN_PATH = '.yarn/releases/yarn.js'

export const createSha256Digest = (data: Buffer): string =>
  createHash('sha256').update(data).digest('hex')

export const getRaijinRuntimeYarnPath = (): string => RAIJIN_RUNTIME_YARN_PATH
