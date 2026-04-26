import assert     from 'node:assert/strict'
import { test }   from 'node:test'

import type { Config } from '@atls/code-runtime/svgr'

import { Icons }  from './icons.js'

type ReplaceAttrValues = Record<string, string>

type IconFixture = {
  source: string
  path: string
  name: string
  component: string
}

type TransformConfig = Partial<Config> & {
  replaceAttrValues?: ReplaceAttrValues
}

class TestIcons extends Icons {
  constructor(
    private readonly replacementsFixture: Record<string, ReplaceAttrValues>,
    onTransform: (config: TransformConfig) => Promise<string>
  ) {
    super(
      {
        transform: (async (_source: string, config: TransformConfig) =>
          onTransform(config)) as never,
        jsx: (() => null) as never,
      },
      (() => {
        throw new Error('Webpack should not be used in this test')
      }) as never,
      { tsLoader: '' },
      process.cwd()
    )
  }

  async runTransform(icons: Array<IconFixture>): Promise<void> {
    await this.transform(icons, {})
  }

  protected override async compileReplacementsAndTemplate(): Promise<{
    replacements: Record<string, ReplaceAttrValues>
    template: Config['template']
  }> {
    return {
      replacements: this.replacementsFixture,
      template: undefined as unknown as Config['template'],
    }
  }
}

test('should pass empty replacements when replacement entry is missing', async () => {
  const replaceAttrValuesCalls: Array<ReplaceAttrValues | undefined> = []

  const icons = new TestIcons({}, async ({ replaceAttrValues }) => {
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
  const replaceAttrValuesCalls: Array<ReplaceAttrValues | undefined> = []
  const replacement: ReplaceAttrValues = {
    '#000': 'currentColor',
  }

  const icons = new TestIcons({ ExistingReplacementIcon: replacement }, async ({ replaceAttrValues }) => {
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
