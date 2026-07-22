import assert                            from 'node:assert/strict'
import { test }                          from 'node:test'

import { renderProjectGenerationResult } from './project.js'

interface RenderedMessages {
  errors: Array<string>
  infos: Array<string>
  warnings: Array<string>
}

const createReport = (): {
  report: Parameters<typeof renderProjectGenerationResult>[0]
  messages: RenderedMessages
} => {
  const messages: RenderedMessages = {
    errors: [],
    infos: [],
    warnings: [],
  }

  return {
    messages,
    report: {
      reportError: (_name: unknown, message: string) => {
        messages.errors.push(message)
      },
      reportInfo: (_name: unknown, message: string) => {
        messages.infos.push(message)
      },
      reportWarning: (_name: unknown, message: string) => {
        messages.warnings.push(message)
      },
    },
  }
}

test('should render generated changes and diagnostics', () => {
  const { report, messages } = createReport()

  renderProjectGenerationResult(report, {
    status: 'succeeded',
    changes: [
      { kind: 'created', path: '/eslint.config.mjs', size: 120 },
      { kind: 'renamed', path: '/before', destination: '/after' },
    ],
    diagnostics: [{ level: 'warning', message: 'Existing configuration was preserved' }],
  })

  assert.deepEqual(messages, {
    errors: [],
    infos: ['CREATE /eslint.config.mjs (120 bytes)', 'RENAME /before -> /after'],
    warnings: ['Existing configuration was preserved'],
  })
})

test('should render a typed scenario failure as a non-zero report outcome', () => {
  const { report, messages } = createReport()

  renderProjectGenerationResult(report, {
    status: 'failed',
    changes: [],
    diagnostics: [],
    failure: {
      code: 'project-collection-unavailable',
      message: 'Project collection is unavailable',
    },
  })

  assert.deepEqual(messages.errors, ['Project collection is unavailable'])
})
