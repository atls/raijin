import type { GenerateIconsInput }     from '../inputs/generate.js'
import type { GeneratedIconFormatter } from '../ports/format.js'
import type { GeneratedIconLinter }    from '../ports/lint.js'
import type { IconModule }             from '../ports/output.js'
import type { IconOutputReplacer }     from '../ports/output.js'
import type { IconSourceReader }       from '../ports/source.js'
import type { IconTransformer }        from '../ports/transform.js'
import type { GenerateIconsResult }    from '../results/generate.js'

import camelcase                       from 'camelcase'

const createComponentName = (name: string): string => `${camelcase(name, { pascalCase: true })}Icon`

const compareNames = (
  { name: left }: { name: string },
  { name: right }: { name: string }
): number => {
  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}

const findDuplicateComponents = (
  modules: ReadonlyArray<Pick<IconModule, 'component'>>
): Array<string> => {
  const occurrences = new Map<string, number>()

  for (const candidate of modules) {
    occurrences.set(candidate.component, (occurrences.get(candidate.component) ?? 0) + 1)
  }

  return Array.from(occurrences)
    .filter(([, count]) => count > 1)
    .map(([component]) => component)
    .sort()
}

export const generateIcons = async (
  input: GenerateIconsInput,
  dependencies: {
    formatter: GeneratedIconFormatter
    linter: GeneratedIconLinter
    output: IconOutputReplacer
    sources: IconSourceReader
    transformer: IconTransformer
  }
): Promise<GenerateIconsResult> => {
  const sources = (await dependencies.sources.read(input.cwd)).sort(compareNames)
  const candidates = sources.map((source) => ({
    component: createComponentName(source.name),
    name: source.name,
    source,
  }))
  const duplicateComponents = findDuplicateComponents(candidates)

  if (duplicateComponents.length > 0) {
    return {
      components: duplicateComponents,
      reason: 'duplicate-components',
      status: 'rejected',
    }
  }

  const modules = await Promise.all(
    candidates.map(
      async (candidate): Promise<IconModule> => ({
        component: candidate.component,
        content: await dependencies.transformer.transform({
          component: candidate.component,
          native: input.native,
          source: candidate.source,
        }),
        name: candidate.name,
      })
    )
  )

  const files = await dependencies.output.replace(input.cwd, modules)
  const formatExitCode = await dependencies.formatter.format(files)

  if (formatExitCode !== 0) {
    return {
      exitCode: formatExitCode,
      files,
      reason: 'format-failed',
      status: 'failed',
    }
  }

  const lintExitCode = await dependencies.linter.lint(files)

  if (lintExitCode !== 0) {
    return {
      exitCode: lintExitCode,
      files,
      reason: 'lint-failed',
      status: 'failed',
    }
  }

  return { files, status: 'generated' }
}
