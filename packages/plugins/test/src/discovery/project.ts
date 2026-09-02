import type { Input }                           from './input.js'

import { toNativeCwd }                          from '@atls/raijin/commands'

import { createFileFilter }                     from './exclusions/project.js'
import { collectTests as collectScenarioTests } from './scenario/collect.js'
import { resolveFolderPattern }                 from './scenario/selection.js'
import { collectTests as collectTargetTests }   from './target/collect.js'

export const discoverProjectTests = async ({
  cwd,
  input,
  rootCwd,
  scenario,
}: Input): Promise<Array<string>> => {
  const includeFile = createFileFilter(cwd)
  const nativeCwd = toNativeCwd(input.cwd)
  const folderPattern = resolveFolderPattern(scenario)
  const files =
    input.targets.length < 1
      ? await collectScenarioTests(input.cwd, folderPattern)
      : Array.from(
          new Set(
            (
              await Promise.all(
                input.targets.map(async (target) =>
                  collectTargetTests(nativeCwd, folderPattern, rootCwd, scenario, target))
              )
            ).flat()
          )
        )

  return files.filter(includeFile)
}
