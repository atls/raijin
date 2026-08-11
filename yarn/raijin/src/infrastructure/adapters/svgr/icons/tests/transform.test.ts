import type { Config }           from '@svgr/core'
import type { Plugin }           from '@svgr/core'

import type { ModuleImporter }   from '../transform.interfaces.js'
import type { TransformOptions } from '../transform.interfaces.js'

import assert                    from 'node:assert/strict'
import { join }                  from 'node:path'
import { test }                  from 'node:test'
import { pathToFileURL }         from 'node:url'

import { create }                from '../transform.js'

type SvgrTransform = NonNullable<TransformOptions['transform']>
type SvgrTransformParameters = Parameters<SvgrTransform>
type SvgrTransformConfiguration = NonNullable<SvgrTransformParameters[1]>
type SvgrTransformState = NonNullable<SvgrTransformParameters[2]>

const template: NonNullable<Config['template']> = () => {
  throw new Error('Unexpected SVGR template call')
}

const jsx: Plugin = () => {
  throw new Error('Unexpected SVGR JSX plugin call')
}

test('should load project modules by exact URL and pass full component replacements to SVGR', async () => {
  const cwd = '/workspace/icons'
  const requested: Array<string> = []
  const calls: Array<{
    configuration: SvgrTransformConfiguration
    state: SvgrTransformState
  }> = []
  const importer: ModuleImporter = async (specifier) => {
    requested.push(specifier)

    return specifier.endsWith('/replacements.ts')
      ? { default: { AlertIcon: { '#000': 'currentColor' } } }
      : { default: template }
  }
  const transform = Object.assign(
    async (...[_source, configuration, state]: SvgrTransformParameters): Promise<string> => {
      if (configuration === undefined || state === undefined) {
        throw new Error('Expected SVGR transform configuration and state')
      }

      calls.push({ configuration, state })

      return 'generated component'
    },
    { sync: (): string => 'generated component' }
  )

  const transformer = create(cwd, { importModule: importer, jsx, transform })

  assert.deepEqual(requested, [])

  const result = await transformer.transform({
    component: 'AlertIcon',
    native: true,
    source: { content: '<svg />', name: 'alert' },
  })

  assert.equal(result, 'generated component')
  assert.deepEqual(requested, [
    pathToFileURL(join(cwd, 'replacements.ts')).href,
    pathToFileURL(join(cwd, 'template.ts')).href,
  ])
  assert.deepEqual(calls, [
    {
      configuration: {
        expandProps: true,
        icon: true,
        native: true,
        replaceAttrValues: { '#000': 'currentColor' },
        template,
        typescript: true,
      },
      state: {
        caller: {
          defaultPlugins: [jsx],
          name: '@atls/raijin',
        },
        componentName: 'AlertIcon',
      },
    },
  ])

  await transformer.transform({
    component: 'AlertIcon',
    native: false,
    source: { content: '<svg />', name: 'alert' },
  })

  assert.deepEqual(requested, [
    pathToFileURL(join(cwd, 'replacements.ts')).href,
    pathToFileURL(join(cwd, 'template.ts')).href,
  ])
})

test('should defer rejecting project module imports until transformation', async () => {
  const failure = new Error('Project icon configuration failed')
  let imports = 0
  const transform = Object.assign(async (): Promise<string> => 'unreachable', {
    sync: (): string => 'unreachable',
  })
  const transformer = create('/workspace/icons', {
    importModule: async () => {
      imports += 1

      throw failure
    },
    jsx,
    transform,
  })

  assert.equal(imports, 0)
  await assert.rejects(
    transformer.transform({
      component: 'AlertIcon',
      native: false,
      source: { content: '<svg />', name: 'alert' },
    }),
    failure
  )
  assert.equal(imports, 2)
})

test('should reject invalid replacement and template default exports at the provider boundary', async () => {
  const invalidConfigurations = [
    {
      modules: [{ default: [] }, { default: template }],
      message: 'Icon replacements default export must be an object',
    },
    {
      modules: [{ default: {} }, { default: {} }],
      message: 'Icon template default export must be a function',
    },
  ]

  await Promise.all(
    invalidConfigurations.map(async ({ message, modules: [replacements, iconTemplate] }) => {
      const transform = Object.assign(async (): Promise<string> => 'unreachable', {
        sync: (): string => 'unreachable',
      })
      const transformer = create('/workspace/icons', {
        importModule: async (specifier) =>
          specifier.endsWith('/replacements.ts') ? replacements : iconTemplate,
        jsx,
        transform,
      })

      await assert.rejects(
        transformer.transform({
          component: 'AlertIcon',
          native: false,
          source: { content: '<svg />', name: 'alert' },
        }),
        { message }
      )
    })
  )
})
