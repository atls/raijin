import type { Plugin }                from '@svgr/core'

import type { IconTransformer }       from '../../../../application/generation/icons/index.js'
import type { IconConfiguration }     from './transform.interfaces.js'
import type { ModuleImporter }        from './transform.interfaces.js'
import type { TransformOptions }      from './transform.interfaces.js'

import { join }                       from 'node:path'
import { pathToFileURL }              from 'node:url'

import * as jsxModule                 from '@svgr/plugin-jsx'
import { transform as transformSvgr } from '@svgr/core'

const importModule: ModuleImporter = async (specifier) => import(specifier)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isPlugin = (value: unknown): value is Plugin => typeof value === 'function'

const readPlugin = (value: unknown): Plugin => {
  const candidate = isRecord(value) && 'default' in value ? value.default : value

  if (!isPlugin(candidate)) {
    throw new TypeError('SVGR JSX plugin must be callable')
  }

  return candidate
}

const readDefaultExport = (value: unknown, subject: string): unknown => {
  if (!isRecord(value) || !('default' in value)) {
    throw new TypeError(`${subject} must provide a default export`)
  }

  return value.default
}

const readReplacements = (value: unknown): IconConfiguration['replacements'] => {
  const replacements = readDefaultExport(value, 'Icon replacements module')

  if (!isRecord(replacements)) {
    throw new TypeError('Icon replacements default export must be an object')
  }

  for (const [component, attributes] of Object.entries(replacements)) {
    if (
      !isRecord(attributes) ||
      Object.values(attributes).some((replacement) => typeof replacement !== 'string')
    ) {
      throw new TypeError(`Icon replacements for ${component} must contain string values`)
    }
  }

  return replacements as IconConfiguration['replacements']
}

const readTemplate = (value: unknown): IconConfiguration['template'] => {
  const template = readDefaultExport(value, 'Icon template module')

  if (typeof template !== 'function') {
    throw new TypeError('Icon template default export must be a function')
  }

  return template as IconConfiguration['template']
}

const loadConfiguration = async (
  cwd: string,
  importer: ModuleImporter
): Promise<IconConfiguration> => {
  const [replacements, template] = await Promise.all([
    importer(pathToFileURL(join(cwd, 'replacements.ts')).href),
    importer(pathToFileURL(join(cwd, 'template.ts')).href),
  ])

  return {
    replacements: readReplacements(replacements),
    template: readTemplate(template),
  }
}

export const create = (cwd: string, options: TransformOptions = {}): IconTransformer => {
  const importer = options.importModule ?? importModule
  const transform = options.transform ?? transformSvgr
  const jsxPlugin = options.jsx ?? readPlugin(jsxModule)
  const configuration = loadConfiguration(cwd, importer)

  return {
    async transform({ component, native, source }) {
      const { replacements, template } = await configuration

      return transform(
        source.content,
        {
          expandProps: true,
          icon: true,
          native,
          replaceAttrValues: replacements[component] ?? {},
          template,
          typescript: true,
        },
        {
          caller: {
            defaultPlugins: [jsxPlugin],
            name: '@atls/raijin',
          },
          componentName: component,
        }
      )
    },
  }
}
