import type { SchematicContext } from '@angular-devkit/schematics'

import assert                    from 'node:assert/strict'
import { mkdtemp }               from 'node:fs/promises'
import { rm }                    from 'node:fs/promises'
import { writeFile }             from 'node:fs/promises'
import { tmpdir }                from 'node:os'
import { join }                  from 'node:path'
import { test }                  from 'node:test'

import { HostTree }              from '@angular-devkit/schematics'
import { callRule }              from '@angular-devkit/schematics'
import { lastValueFrom }         from 'rxjs'

import { main }                  from '../factory.js'

const createContext = (): SchematicContext =>
  ({
    logger: { info: () => undefined },
    schematic: {
      description: {
        path: join(import.meta.dirname, '../../collection/project'),
      },
    },
  }) as unknown as SchematicContext

const createTree = (): HostTree => {
  const tree = new HostTree()

  tree.create('/package.json', '{"name":"@fixture/project"}\n')
  tree.create('/tsconfig.json', '{"compilerOptions":{"composite":true}}\n')
  tree.create('/.gitignore', 'custom-cache/\n')

  return tree
}

const runFactory = async (type: 'library' | 'project'): Promise<HostTree> => {
  const cwd = await mkdtemp(join(tmpdir(), `raijin-${type}-factory-`))

  try {
    await writeFile(join(cwd, 'package.json'), '{"name":"@fixture/project"}\n')

    return (await lastValueFrom(
      callRule(main({ cwd, type }), createTree(), createContext())
    )) as HostTree
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
}

test('should generate the complete project scaffold contract', async () => {
  const tree = await runFactory('project')
  const tsconfig = JSON.parse(tree.readText('/tsconfig.json')) as {
    compilerOptions: Record<string, unknown>
  }

  assert.equal(
    tree.readText('/.prettierrc.mjs'),
    "import config from '@atls/raijin/prettier'\n\nexport default config\n"
  )
  assert.match(tree.readText('/eslint.config.mjs'), /@atls\/raijin\/eslint/)
  assert.match(tree.readText('/.github/workflows/checks.yaml'), /yarn check/)
  assert.match(tree.readText('/.github/workflows/release.yaml'), /@fixture\/project-/)
  assert.match(tree.readText('/.github/workflows/preview.yaml'), /@fixture\/project-/)
  assert.equal(tree.exists('/.github/workflows/publish.yaml'), false)
  assert.equal(tree.exists('/.github/workflows/version.yaml'), false)
  assert.equal(tsconfig.compilerOptions.composite, true)
  assert.equal(tsconfig.compilerOptions.module, 'NodeNext')
  assert.equal(tsconfig.compilerOptions.target, 'es2022')
  assert.match(tree.readText('/.gitignore'), /custom-cache/)
  assert.equal(tree.readText('/.gitignore').match(/custom-cache\//g)?.length, 1)
})

test('should generate the library-specific scaffold contract', async () => {
  const tree = await runFactory('library')

  assert.match(tree.readText('/.github/workflows/publish.yaml'), /npm publish --access public/)
  assert.match(tree.readText('/.github/workflows/version.yaml'), /version patch --deferred/)
  assert.equal(tree.exists('/.github/workflows/release.yaml'), false)
  assert.equal(tree.exists('/.github/workflows/preview.yaml'), false)
})
