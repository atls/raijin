/* eslint-disable n/no-sync */

import type { CommandInput }  from '@atls/raijin/commands'
import type { CommandTarget } from '@atls/raijin/commands'

import type { TestScenario }  from './interfaces/input.js'

import { readFileSync }       from 'node:fs'
import { stat }               from 'node:fs/promises'
import { basename }           from 'node:path'
import { join }               from 'node:path'
import { relative }           from 'node:path'
import { resolve }            from 'node:path'

import ignorer                from 'ignore'

import { toNativeCwd }        from '@atls/raijin/commands'
import { toPortableCwd }      from '@atls/raijin/commands'
import { discoverFiles }      from '@atls/raijin/filesystem'
import { toNativePath }       from '@atls/raijin/filesystem'
import { toPortablePath }     from '@atls/raijin/filesystem'

type TargetStat = Awaited<ReturnType<typeof stat>>
type ExistingTargetPath = {
  path: string
  stat: TargetStat
}
type MissingTargetPath = {
  error: unknown
}
type TargetPathResult = ExistingTargetPath | MissingTargetPath

interface DiscoverProjectTestsInput {
  cwd: string
  input: CommandInput
  rootCwd: string
  scenario: TestScenario
}

const DISCOVERY_IGNORE = ['**/node_modules/**', '**/dist/**', '**/.yarn/**']

const isMissingPathError = (error: unknown): boolean =>
  !!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')

const isExistingTargetPath = (result: TargetPathResult): result is ExistingTargetPath =>
  'stat' in result

const toNativeFiles = (files: Awaited<ReturnType<typeof discoverFiles>>): Array<string> =>
  files.map((file) => toNativePath(file))

class ProjectTestDiscovery {
  private readonly ignore: ignorer.Ignore

  constructor(
    private readonly cwd: string,
    private readonly rootCwd: string
  ) {
    const content = readFileSync(join(cwd, 'package.json'), 'utf8')
    const { testIgnorePatterns = [] } = JSON.parse(content) as {
      testIgnorePatterns?: Array<string>
    }

    this.ignore = ignorer.default().add(testIgnorePatterns)
  }

  async collect(input: CommandInput, scenario: TestScenario): Promise<Array<string>> {
    const files = await this.collectTestFiles(input, scenario)

    return files.filter((file) => this.ignore.filter([relative(this.cwd, file)]).length !== 0)
  }

  private async collectTestFiles(
    input: CommandInput,
    scenario: TestScenario
  ): Promise<Array<string>> {
    const cwd = toNativeCwd(input.cwd)
    const folderPattern = this.getFolderPattern(scenario)

    if (input.targets.length < 1) {
      return toNativeFiles(
        await discoverFiles({
          cwd: input.cwd,
          patterns: [`**/${folderPattern}/*.test.{ts,tsx,js,jsx}`],
          ignore: DISCOVERY_IGNORE,
          dot: true,
        })
      )
    }

    const testFiles = await Promise.all(
      input.targets.map(async (target) =>
        this.collectPatternTestFiles(cwd, folderPattern, scenario, target))
    )

    return Array.from(new Set(testFiles.flat()))
  }

  private async collectPatternTestFiles(
    cwd: string,
    folderPattern: string,
    scenario: TestScenario,
    target: CommandTarget
  ): Promise<Array<string>> {
    const discoveryOptions = {
      cwd: toPortableCwd(cwd),
      dot: true,
      ignore: DISCOVERY_IGNORE,
    }

    let targetPath

    try {
      targetPath = await this.findExistingTargetPath(target)
    } catch (error) {
      if (isMissingPathError(error)) {
        if (this.isGlobPattern(target.request)) {
          return this.collectGlobPatternTestFiles(cwd, target.request)
        }

        if (this.isFilename(target.request)) {
          return toNativeFiles(
            await discoverFiles({
              ...discoveryOptions,
              patterns: [`**/${folderPattern}/*${target.request}*.test.{ts,tsx,js,jsx}`],
            })
          )
        }

        throw new Error(`Test target does not exist: ${target.request}`)
      }

      throw error
    }

    if (targetPath.stat.isDirectory()) {
      return toNativeFiles(
        await discoverFiles({
          ...discoveryOptions,
          cwd: toPortablePath(targetPath.path),
          patterns: this.createDirectoryTargetPatterns(folderPattern, scenario, targetPath.path),
        })
      )
    }

    return [targetPath.path]
  }

  private async collectGlobPatternTestFiles(cwd: string, pattern: string): Promise<Array<string>> {
    const files = await discoverFiles({
      cwd: toPortableCwd(cwd),
      patterns: [pattern],
      ignore: DISCOVERY_IGNORE,
      dot: true,
    })

    if (files.length > 0 || cwd === this.rootCwd) {
      return toNativeFiles(files)
    }

    return toNativeFiles(
      await discoverFiles({
        cwd: toPortableCwd(this.rootCwd),
        patterns: [pattern],
        ignore: DISCOVERY_IGNORE,
        dot: true,
      })
    )
  }

  private async findExistingTargetPath(target: CommandTarget): Promise<ExistingTargetPath> {
    const targetPaths = this.createTargetPaths(target)
    const targetResults = await Promise.all(
      targetPaths.map(async (targetPath): Promise<TargetPathResult> => {
        try {
          return {
            path: targetPath,
            stat: await stat(targetPath),
          }
        } catch (error) {
          return { error }
        }
      })
    )
    const existingTarget = targetResults.find(isExistingTargetPath)

    if (existingTarget) {
      return existingTarget
    }

    const unexpectedTarget = targetResults.find(
      (result): result is MissingTargetPath =>
        'error' in result && !isMissingPathError(result.error)
    )

    if (unexpectedTarget) {
      throw unexpectedTarget.error
    }

    for (const targetResult of targetResults) {
      if ('error' in targetResult) {
        throw targetResult.error
      }
    }

    throw new Error(`Test target does not exist: ${target.request}`)
  }

  private createTargetPaths(target: CommandTarget): Array<string> {
    const cwdTargetPath = toNativePath(target.path)
    const rootTargetPath = resolve(this.rootCwd, target.request)

    return cwdTargetPath === rootTargetPath ? [cwdTargetPath] : [cwdTargetPath, rootTargetPath]
  }

  private isFilename(pattern: string): boolean {
    const hasPathSeparator = pattern.includes('/') || pattern.includes('\\')
    const hasValidExtension = /\.(js|jsx|ts|tsx)$/.test(pattern)

    return !hasPathSeparator && !hasValidExtension
  }

  private isGlobPattern(pattern: string): boolean {
    return /[*?[\]{}]/.test(pattern)
  }

  private createDirectoryTargetPatterns(
    folderPattern: string,
    scenario: TestScenario,
    targetPath: string
  ): Array<string> {
    const directTestPattern = '*.test.{ts,tsx,js,jsx}'
    const nestedTestPattern = `**/${folderPattern}/${directTestPattern}`
    const targetFolder = basename(targetPath)

    if (scenario === 'general') {
      return [directTestPattern, `**/${directTestPattern}`]
    }

    if (scenario === 'integration') {
      return targetFolder === 'integration'
        ? [directTestPattern, nestedTestPattern]
        : [nestedTestPattern]
    }

    return targetFolder === 'integration'
      ? [nestedTestPattern]
      : [directTestPattern, nestedTestPattern]
  }

  private getFolderPattern(scenario: TestScenario): string {
    if (scenario === 'general') {
      return '*'
    }

    return scenario === 'unit' ? '!(integration)' : 'integration'
  }
}

export const discoverProjectTests = async ({
  cwd,
  input,
  rootCwd,
  scenario,
}: DiscoverProjectTestsInput): Promise<Array<string>> =>
  new ProjectTestDiscovery(cwd, rootCwd).collect(input, scenario)
