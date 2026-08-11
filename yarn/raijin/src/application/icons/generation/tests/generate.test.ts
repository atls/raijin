import type { Module } from '../ports/output.interfaces.js'
import type { Source } from '../ports/source.interfaces.js'

import assert          from 'node:assert/strict'
import { test }        from 'node:test'

import { generate }    from '../generate.js'

const createDependencies = (
  sources: Array<Source>,
  options: {
    formatExitCode?: number
    lintExitCode?: number
  } = {}
) => {
  const formatted: Array<ReadonlyArray<string>> = []
  const linted: Array<ReadonlyArray<string>> = []
  const modules: Array<Module> = []
  const transformed: Array<string> = []

  const dependencies = {
    formatter: {
      format: async (files) => {
        formatted.push(files)

        return options.formatExitCode ?? 0
      },
    },
    linter: {
      lint: async (files) => {
        linted.push(files)

        return options.lintExitCode ?? 0
      },
    },
    output: {
      replace: async (_cwd, generated) => {
        modules.push(...generated)

        return generated.map((module) => `src/${module.name}.icon.tsx`).concat('src/index.ts')
      },
    },
    sources: {
      read: async () => sources,
    },
    transformer: {
      transform: async ({ component, source }) => {
        transformed.push(component)

        return `export const ${component} = ${JSON.stringify(source.content)}`
      },
    },
  } satisfies Parameters<typeof generate>[1]

  return { dependencies, formatted, linted, modules, transformed }
}

test('should transform and write sources in deterministic name order', async () => {
  const sources = [
    { content: '<svg id="zebra" />', name: 'zebra' },
    { content: '<svg id="apple" />', name: 'apple' },
  ]
  const { dependencies, formatted, linted, modules, transformed } = createDependencies(sources)

  const result = await generate({ cwd: '/workspace', native: true }, dependencies)

  const files = ['src/apple.icon.tsx', 'src/zebra.icon.tsx', 'src/index.ts']

  assert.deepEqual(transformed, ['AppleIcon', 'ZebraIcon'])
  assert.deepEqual(modules, [
    {
      component: 'AppleIcon',
      content: 'export const AppleIcon = "<svg id=\\"apple\\" />"',
      name: 'apple',
    },
    {
      component: 'ZebraIcon',
      content: 'export const ZebraIcon = "<svg id=\\"zebra\\" />"',
      name: 'zebra',
    },
  ])
  assert.deepEqual(formatted, [files])
  assert.deepEqual(linted, [files])
  assert.deepEqual(result, { files, status: 'generated' })
})

test('should reject colliding component names before transforming or writing output', async () => {
  const { dependencies, formatted, linted, modules, transformed } = createDependencies([
    { content: '<svg />', name: 'alert-circle' },
    { content: '<svg />', name: 'alert_circle' },
  ])

  const result = await generate({ cwd: '/workspace', native: false }, dependencies)

  assert.deepEqual(result, {
    components: ['AlertCircleIcon'],
    reason: 'duplicate-components',
    status: 'rejected',
  })
  assert.deepEqual(transformed, [])
  assert.deepEqual(modules, [])
  assert.deepEqual(formatted, [])
  assert.deepEqual(linted, [])
})

test('should preserve a format failure exit code and skip linting', async () => {
  const { dependencies, formatted, linted } = createDependencies(
    [{ content: '<svg />', name: 'alert' }],
    { formatExitCode: 23 }
  )

  const result = await generate({ cwd: '/workspace', native: false }, dependencies)

  assert.deepEqual(result, {
    exitCode: 23,
    files: ['src/alert.icon.tsx', 'src/index.ts'],
    reason: 'format-failed',
    status: 'failed',
  })
  assert.deepEqual(formatted, [['src/alert.icon.tsx', 'src/index.ts']])
  assert.deepEqual(linted, [])
})

test('should preserve a lint failure exit code after formatting', async () => {
  const { dependencies, formatted, linted } = createDependencies(
    [{ content: '<svg />', name: 'alert' }],
    { lintExitCode: 31 }
  )

  const result = await generate({ cwd: '/workspace', native: false }, dependencies)

  assert.deepEqual(result, {
    exitCode: 31,
    files: ['src/alert.icon.tsx', 'src/index.ts'],
    reason: 'lint-failed',
    status: 'failed',
  })
  assert.deepEqual(formatted, [['src/alert.icon.tsx', 'src/index.ts']])
  assert.deepEqual(linted, [['src/alert.icon.tsx', 'src/index.ts']])
})
