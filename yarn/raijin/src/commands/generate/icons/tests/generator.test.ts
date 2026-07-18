import type { Config }                from '@atls/raijin/svgr'

import type { AttributeReplacements } from '../generator.interfaces.js'
import type { CompiledConfiguration } from '../generator.interfaces.js'
import type { IconReplacements }      from '../generator.interfaces.js'
import type { Source }                from '../generator.interfaces.js'

import assert                         from 'node:assert/strict'
import { mkdir }                      from 'node:fs/promises'
import { mkdtemp }                    from 'node:fs/promises'
import { readFile }                   from 'node:fs/promises'
import { rm }                         from 'node:fs/promises'
import { writeFile }                  from 'node:fs/promises'
import { tmpdir }                     from 'node:os'
import { join }                       from 'node:path'
import { test }                       from 'node:test'

import { npath }                      from '@yarnpkg/fslib'

import { Generator }                  from '../generator.js'

const TEMPLATE_PLACEHOLDER_PREFIX = '$'

const createTemplatePlaceholder = (expression: string): string =>
  `${TEMPLATE_PLACEHOLDER_PREFIX}{${expression}}`

class TestGenerator extends Generator {
  constructor(
    private readonly replacementsFixture: IconReplacements,
    onTransform: (config: Config) => Promise<string>
  ) {
    super(
      {
        transform: (async (_source: string, config: Config) => onTransform(config)) as never,
        jsx: (() => null) as never,
      },
      (() => {
        throw new Error('Webpack should not be used in this test')
      }) as never,
      { tsLoader: '' },
      process.cwd()
    )
  }

  async runTransform(icons: Array<Source>): Promise<void> {
    await this.transform(icons, {})
  }

  protected override async compileReplacementsAndTemplate(): Promise<CompiledConfiguration> {
    return {
      replacements: this.replacementsFixture,
      template: undefined as unknown as Config['template'],
    }
  }
}

test('should pass empty replacements when replacement entry is missing', async () => {
  const replaceAttrValuesCalls: Array<AttributeReplacements | undefined> = []

  const icons = new TestGenerator({}, async ({ replaceAttrValues }) => {
    replaceAttrValuesCalls.push(replaceAttrValues)

    return 'export const MissingReplacementIcon = () => null'
  })

  await icons.runTransform([
    {
      source: '<svg />',
      path: '/tmp/missing-replacement.svg',
      name: 'missing-replacement',
      component: 'MissingReplacement',
    },
  ])

  assert.deepEqual(replaceAttrValuesCalls, [{}])
})

test('should pass configured replacements when replacement entry exists', async () => {
  const replaceAttrValuesCalls: Array<AttributeReplacements | undefined> = []
  const replacement: AttributeReplacements = {
    '#000': 'currentColor',
  }

  const icons = new TestGenerator({ ExistingReplacementIcon: replacement }, async ({
    replaceAttrValues,
  }) => {
    replaceAttrValuesCalls.push(replaceAttrValues)

    return 'export const ExistingReplacementIcon = () => null'
  })

  await icons.runTransform([
    {
      source: '<svg />',
      path: '/tmp/existing-replacement.svg',
      name: 'existing-replacement',
      component: 'ExistingReplacement',
    },
  ])

  assert.deepEqual(replaceAttrValuesCalls, [replacement])
})

test('should generate icon components through the Raijin runtime', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icons-generation-'))

  try {
    await mkdir(join(cwd, 'icons'))
    await writeFile(
      join(cwd, 'icons/alert.svg'),
      '<svg viewBox="0 0 16 16"><path fill="#fff" d="M8 1l7 14H1z"/></svg>\n'
    )
    await writeFile(
      join(cwd, 'icons/check.svg'),
      '<svg viewBox="0 0 16 16"><path fill="#000" d="M1 8l4 4 10-10"/></svg>\n'
    )
    await writeFile(
      join(cwd, 'replacements.ts'),
      "export default { CheckIcon: { '#000': 'currentColor' } }\n"
    )
    await writeFile(
      join(cwd, 'template.ts'),
      [
        'export default (variables, { tpl }) => tpl`',
        `${createTemplatePlaceholder('variables.imports')};`,
        `${createTemplatePlaceholder('variables.interfaces')};`,
        `const ${createTemplatePlaceholder('variables.componentName')} = (${createTemplatePlaceholder('variables.props')}) => ${createTemplatePlaceholder('variables.jsx')};`,
        `${createTemplatePlaceholder('variables.exports')};`,
        '`',
        '',
      ].join('\n')
    )

    const generator = await Generator.initialize(npath.toPortablePath(cwd))

    assert.deepEqual(await generator.generate(), ['alert.icon.tsx', 'check.icon.tsx', 'index.ts'])

    assert.match(await readFile(join(cwd, 'src/alert.icon.tsx'), 'utf8'), /AlertIcon/)
    assert.match(await readFile(join(cwd, 'src/check.icon.tsx'), 'utf8'), /CheckIcon/)
    assert.match(await readFile(join(cwd, 'src/check.icon.tsx'), 'utf8'), /currentColor/)
    assert.doesNotMatch(await readFile(join(cwd, 'src/check.icon.tsx'), 'utf8'), /#000/)
    assert.equal(
      await readFile(join(cwd, 'src/index.ts'), 'utf8'),
      "export * from './alert.icon.jsx'\nexport * from './check.icon.jsx'"
    )
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
