import commitlint      from '@commitlint/lint'
import commitformat    from '@commitlint/format'
import { LintOutcome } from '@commitlint/types'

import { load }        from './config'

const lint = async (message: string): Promise<LintOutcome> => {
  const { rules } = await load()

  return commitlint(message, rules)
}

const format = (
  report,
  options = {
    helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
  }
) => commitformat(report, options)

export { lint, format }
