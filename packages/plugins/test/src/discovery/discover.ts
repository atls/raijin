import type { CommandInput }       from '@atls/raijin/commands'
import type { CommandTarget }      from '@atls/raijin/commands'
import type { PortablePath }       from '@yarnpkg/fslib'

import type { TestScenario }       from '../interfaces/input.js'
import type { DiscoveryInput }     from './interfaces/input.js'

import { toNativeCwd }             from '@atls/raijin/commands'
import { toPortableCwd }           from '@atls/raijin/commands'
import { discoverFiles }           from '@atls/raijin/filesystem'
import { toNativePath }            from '@atls/raijin/filesystem'
import { toPortablePath }          from '@atls/raijin/filesystem'

import { TargetMissingException }  from '../exceptions/target-missing.js'
import { createFileFilter }        from './ignore.js'
import { discoveryIgnorePatterns } from './ignore.js'
import { createDirectoryPatterns } from './patterns.js'
import { resolveFolderPattern }    from './patterns.js'
import { findExistingTargetPath }  from './target-path.js'
import { isFilenameTarget }        from './target-pattern.js'
import { isGlobTarget }            from './target-pattern.js'

const toNativeFiles = (files: ReadonlyArray<PortablePath>): Array<string> =>
  files.map((file) => toNativePath(file))

class ProjectTestDiscovery {
  private readonly includeFile: (file: string) => boolean

  constructor(
    private readonly cwd: string,
    private readonly rootCwd: string
  ) {
    this.includeFile = createFileFilter(cwd)
  }

  async collect(input: CommandInput, scenario: TestScenario): Promise<Array<string>> {
    const files = await this.collectTestFiles(input, scenario)

    return files.filter(this.includeFile)
  }

  private async collectTestFiles(
    input: CommandInput,
    scenario: TestScenario
  ): Promise<Array<string>> {
    const cwd = toNativeCwd(input.cwd)
    const folderPattern = resolveFolderPattern(scenario)

    if (input.targets.length < 1) {
      return toNativeFiles(
        await discoverFiles({
          cwd: input.cwd,
          patterns: [`**/${folderPattern}/*.test.{ts,tsx,js,jsx}`],
          ignore: discoveryIgnorePatterns,
          dot: true,
        })
      )
    }

    const testFiles = await Promise.all(
      input.targets.map(async (target) =>
        this.collectTargetTestFiles(cwd, folderPattern, scenario, target))
    )

    return Array.from(new Set(testFiles.flat()))
  }

  private async collectTargetTestFiles(
    cwd: string,
    folderPattern: string,
    scenario: TestScenario,
    target: CommandTarget
  ): Promise<Array<string>> {
    const discoveryOptions = {
      cwd: toPortableCwd(cwd),
      dot: true,
      ignore: discoveryIgnorePatterns,
    }

    const targetPath = await findExistingTargetPath(target, this.rootCwd)

    if (!targetPath) {
      if (isGlobTarget(target.request)) {
        return this.collectGlobTargetFiles(cwd, target.request)
      }

      if (isFilenameTarget(target.request)) {
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

  private async collectGlobTargetFiles(cwd: string, pattern: string): Promise<Array<string>> {
    const files = await discoverFiles({
      cwd: toPortableCwd(cwd),
      patterns: [pattern],
      ignore: discoveryIgnorePatterns,
      dot: true,
    })

    if (files.length > 0 || cwd === this.rootCwd) {
      return toNativeFiles(files)
    }

    return toNativeFiles(
      await discoverFiles({
        cwd: toPortableCwd(this.rootCwd),
        patterns: [pattern],
        ignore: discoveryIgnorePatterns,
        dot: true,
      })
    )
  }
}

export const discoverProjectTests = async ({
  cwd,
  input,
  rootCwd,
  scenario,
}: DiscoveryInput): Promise<Array<string>> =>
  new ProjectTestDiscovery(cwd, rootCwd).collect(input, scenario)
