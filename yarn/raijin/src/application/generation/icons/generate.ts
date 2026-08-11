import type { GenerateIconsDependencies } from './generate.interfaces.js'
import type { GenerateIconsInput }        from './input.interfaces.js'
import type { IconModule }                from './module.interfaces.js'
import type { GenerateIconsResult }       from './result.js'

import { createIconComponentName }        from './name.js'

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
  dependencies: GenerateIconsDependencies
): Promise<GenerateIconsResult> => {
  const sources = (await dependencies.sources.read(input.cwd)).sort(compareNames)
  const candidates = sources.map((source) => ({
    component: createIconComponentName(source.name),
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
