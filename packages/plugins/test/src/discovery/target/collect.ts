import type { CommandTarget }      from '@atls/raijin/commands'
import type { PortablePath }       from '@yarnpkg/fslib'

import type { TestScenario }       from '../../interfaces/input.js'

import { toPortableCwd }           from '@atls/raijin/commands'
import { discoverFiles }           from '@atls/raijin/filesystem'
import { toNativePath }            from '@atls/raijin/filesystem'
import { toPortablePath }          from '@atls/raijin/filesystem'

import { TargetMissingException }  from '../exceptions/target.js'
import { defaultPatterns }         from '../exclusions/defaults.js'
import { createDirectoryPatterns } from '../scenario/selection.js'
import { locateExisting }          from './locate.js'
import { isGlobRequest }           from './request.js'
import { isNameRequest }           from './request.js'

const toNativeFiles = (files: ReadonlyArray<PortablePath>): Array<string> =>
  files.map((file) => toNativePath(file))

const collectGlobFiles = async (
  cwd: string,
  rootCwd: string,
  pattern: string
): Promise<Array<string>> => {
  const files = await discoverFiles({
    cwd: toPortableCwd(cwd),
    patterns: [pattern],
    ignore: defaultPatterns,
    dot: true,
  })

  if (files.length > 0 || cwd === rootCwd) {
    return toNativeFiles(files)
  }

  return toNativeFiles(
    await discoverFiles({
      cwd: toPortableCwd(rootCwd),
      patterns: [pattern],
      ignore: defaultPatterns,
      dot: true,
    })
  )
}

export const collectTests = async (
  cwd: string,
  folderPattern: string,
  rootCwd: string,
  scenario: TestScenario,
  target: CommandTarget
): Promise<Array<string>> => {
  const discoveryOptions = {
    cwd: toPortableCwd(cwd),
    dot: true,
    ignore: defaultPatterns,
  }
  const targetPath = await locateExisting(target, rootCwd)

  if (!targetPath) {
    if (isGlobRequest(target.request)) {
      return collectGlobFiles(cwd, rootCwd, target.request)
    }

    if (isNameRequest(target.request)) {
      return toNativeFiles(
        await discoverFiles({
          ...discoveryOptions,
          patterns: [`**/${folderPattern}/*${target.request}*.test.{ts,tsx,js,jsx}`],
        })
      )
    }

    throw new TargetMissingException(target.request)
  }

  if (targetPath.stat.isDirectory()) {
    return toNativeFiles(
      await discoverFiles({
        ...discoveryOptions,
        cwd: toPortablePath(targetPath.path),
        patterns: createDirectoryPatterns(folderPattern, scenario, targetPath.path),
      })
    )
  }

  return [targetPath.path]
}
