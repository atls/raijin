import type { FormatSourcesInput }  from './input.interfaces.js'
import type { SourceFiles }         from './ports/files.interfaces.js'
import type { SourceFormatter }     from './ports/format.interfaces.js'
import type { FormatSourcesResult } from './result.interfaces.js'

export const formatSources = async (
  { targets }: FormatSourcesInput,
  dependencies: {
    readonly files: SourceFiles
    readonly formatter: SourceFormatter
  }
): Promise<FormatSourcesResult> => {
  const outcomes: Array<FormatSourcesResult['files'][number]> = []
  const resolvedTargets = await dependencies.files.resolve(targets)

  await resolvedTargets.reduce<Promise<void>>(async (previous, target) => {
    await previous

    const source = await dependencies.files.read(target.path)
    const output = await dependencies.formatter.format(target, source)
    const status = output === source ? 'unchanged' : 'changed'

    if (status === 'changed') {
      await dependencies.files.write(target.path, output)
    }

    outcomes.push({ file: target.file, status })
  }, Promise.resolve())

  return { files: outcomes }
}
