import type { PortablePath } from '@yarnpkg/fslib'

import { discoverFiles }     from '@atls/raijin/filesystem'
import { toNativePath }      from '@atls/raijin/filesystem'

import { defaultPatterns }   from '../exclusions/defaults.js'

const toNativeFiles = (files: ReadonlyArray<PortablePath>): Array<string> =>
  files.map((file) => toNativePath(file))

export const collectTests = async (
  cwd: PortablePath,
  folderPattern: string
): Promise<Array<string>> =>
  toNativeFiles(
    await discoverFiles({
      cwd,
      patterns: [`**/${folderPattern}/*.test.{ts,tsx,js,jsx}`],
      ignore: defaultPatterns,
      dot: true,
    })
  )
