import assert                         from 'node:assert/strict'
import { cp }                         from 'node:fs/promises'
import { mkdir }                      from 'node:fs/promises'
import { mkdtemp }                    from 'node:fs/promises'
import { readFile }                   from 'node:fs/promises'
import { readdir }                    from 'node:fs/promises'
import { rm }                         from 'node:fs/promises'
import { writeFile }                  from 'node:fs/promises'
import { dirname }                    from 'node:path'
import { join }                       from 'node:path'
import { relative }                   from 'node:path'
import { after }                      from 'node:test'
import { before }                     from 'node:test'
import { test }                       from 'node:test'

import { NodeWorkflow }               from '@angular-devkit/schematics/tools/index.js'
import { tgzUtils }                   from '@yarnpkg/core'
import { xfs }                        from '@yarnpkg/fslib'
import { npath }                      from '@yarnpkg/fslib'
import { ppath }                      from '@yarnpkg/fslib'
import { lastValueFrom }              from 'rxjs'

import { prepareProjectGeneration } from '../../../../../../../cli/scripts/runtime/consumer/project-generation/prepare.js'
import { verifyProjectGeneration } from '../../../../../../../cli/scripts/runtime/consumer/project-generation/verify.js'
import { buildProjectCollection }     from '../../../../../../scripts/generation/project/build.js'
import { materialize }                from '../../yarn/collection/package.js'
import { readSource }                 from '../../yarn/collection/package.js'
import { scaffoldProjectWithAngular } from '../scaffold.js'

const baselinePath = join(import.meta.dirname, 'fixtures/baseline')
const collectionSource = 'src/infrastructure/generation/project/angular/collection'
const scaffoldTypes = ['project', 'library'] as const

let collectionPath = ''
let buildRoot = ''
let fixtureRoot = ''

const snapshot = async (root: string): Promise<Record<string, string>> => {
  const paths = await readdir(root, { recursive: true, withFileTypes: true })

  return Object.fromEntries<string>(
    await Promise.all(
      paths
        .filter((entry) => entry.isFile())
        .map(async (entry): Promise<[string, string]> => {
          const path = join(entry.parentPath, entry.name)

          return [relative(root, path), await readFile(path, 'utf8')]
        })
    )
  )
}

const createTarget = async (name: string): Promise<string> => {
  const target = join(fixtureRoot, name)

  await mkdir(target, { recursive: true })

  return target
}

before(async () => {
  fixtureRoot = await xfs.mktempPromise()
  buildRoot = await mkdtemp(join(import.meta.dirname, '.collection-'))
  await cp(join(import.meta.dirname, '../collection'), join(buildRoot, collectionSource), {
    recursive: true,
  })
  await buildProjectCollection({ packageRoot: buildRoot })
  collectionPath = join(buildRoot, 'dist/generation/project/collection/collection.json')
})

after(async () => {
  if (fixtureRoot) {
    await rm(fixtureRoot, { recursive: true, force: true })
  }

  if (buildRoot) {
    await rm(buildRoot, { recursive: true, force: true })
  }
})

scaffoldTypes.forEach((scaffoldType) => {
  test(`should generate exactly the neutral ${scaffoldType} baseline from the built collection`, async () => {
    const target = await createTarget(scaffoldType)
    const expected = Object.fromEntries<string>(
      Object.entries(await snapshot(baselinePath)).map(([path, content]): [string, string] => [
        path.replace(/\.fixture$/u, ''),
        content,
      ])
    )
    const result = await scaffoldProjectWithAngular({
      collectionPath,
      scaffoldType,
      targetPath: target,
    })

    assert.equal(result.status, 'generated', JSON.stringify(result))

    const actual = await snapshot(target)

    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort())

    for (const [path, content] of Object.entries(expected)) {
      if (path === 'tsconfig.json') {
        assert.deepEqual(JSON.parse(actual[path]), JSON.parse(content))
      } else {
        assert.equal(actual[path], content, path)
      }
    }

    assert.deepEqual(
      result.changes.map(({ artifact }) => artifact).sort(),
      Object.keys(expected)
        .map((path) => `/${path}`)
        .sort()
    )
    assert.deepEqual(
      await scaffoldProjectWithAngular({ collectionPath, scaffoldType, targetPath: target }),
      { status: 'generated', changes: [] }
    )
  })

  test(`should preserve existing user files when generating a ${scaffoldType}`, async () => {
    const target = await createTarget(`${scaffoldType}-existing`)
    const existing = {
      '.gitignore': '',
      '.prettierrc.mjs': 'export default { semi: true }\n',
      'eslint.config.mjs': 'export default [{ ignores: ["vendor/**"] }]\n',
      '.github/workflows/release.yaml': 'name: User release\non: workflow_dispatch\njobs: {}\n',
      '.github/workflows/checks.yaml': 'name: User checks\non: push\njobs: {}\n',
      '.config/husky/pre-commit': '#!/bin/sh\necho user-hook\n',
      'package.json': '{"name":"existing","scripts":{"start":"node app.js"}}\n',
      'user.config.json': '{"enabled":true}\n',
    }

    await Promise.all(
      Object.entries(existing).map(async ([path, content]) => {
        await mkdir(dirname(join(target, path)), { recursive: true })
        await writeFile(join(target, path), content)
      })
    )

    await writeFile(
      join(target, 'tsconfig.json'),
      '{\n// user configuration\n"compilerOptions":{"target":"esnext","baseUrl":"."},"include":["src"]\n}\n'
    )

    const result = await scaffoldProjectWithAngular({
      collectionPath,
      scaffoldType,
      targetPath: target,
    })
    const actual = await snapshot(target)
    const baseline = JSON.parse(await readFile(join(baselinePath, 'tsconfig.json.fixture'), 'utf8'))

    assert.equal(result.status, 'generated', JSON.stringify(result))
    assert.deepEqual(Object.keys(actual).sort(), [...Object.keys(existing), 'tsconfig.json'].sort())

    for (const [path, content] of Object.entries(existing)) {
      assert.equal(actual[path], content, path)
    }

    assert.deepEqual(JSON.parse(actual['tsconfig.json']), {
      compilerOptions: { ...baseline.compilerOptions, target: 'esnext', baseUrl: '.' },
      include: ['src'],
    })
    assert.deepEqual(
      result.changes.map(({ artifact, kind }) => ({ artifact, kind })),
      [{ artifact: '/tsconfig.json', kind: 'updated' }]
    )
    assert.deepEqual(
      await scaffoldProjectWithAngular({ collectionPath, scaffoldType, targetPath: target }),
      { status: 'generated', changes: [] }
    )
  })
})

test('should leave the target untouched when an Angular rule fails', async () => {
  const target = await createTarget('transaction')

  await writeFile(join(target, 'tsconfig.json'), '{ invalid TypeScript configuration')

  const original = await snapshot(target)
  const result = await scaffoldProjectWithAngular({
    collectionPath,
    scaffoldType: 'project',
    targetPath: target,
  })

  assert.equal(result.status, 'failed')
  assert.match(result.failure.message, /Unexpected token|JSON/)
  assert.deepEqual(await snapshot(target), original)
})

test('should validate variant and removed options through the Angular schema', async () => {
  await Promise.all(
    [
      { scaffoldType: 'service', typescriptCompilerOptions: {} },
      ...[
        'checkoutAction',
        'containerRegistry',
        'containerRepositoryExpression',
        'nodeVersion',
        'npmTokenSecret',
        'setupNodeAction',
      ].map((option) => ({
        scaffoldType: 'project',
        typescriptCompilerOptions: {},
        [option]: 'obsolete',
      })),
    ].map(async (options, index) => {
      const target = await createTarget(`schema-${index}`)
      const workflow = new NodeWorkflow(target, { schemaValidation: true })

      await assert.rejects(
        lastValueFrom(
          workflow.execute({ collection: collectionPath, schematic: 'project', options })
        ),
        /schema|additional properties/i
      )
      assert.deepEqual(await snapshot(target), {})
    })
  )
})

test('should return the actual collection provider failure', async () => {
  const target = await createTarget('missing-collection')
  const result = await scaffoldProjectWithAngular({
    collectionPath: join(fixtureRoot, 'missing/collection.json'),
    scaffoldType: 'project',
    targetPath: target,
  })

  assert.equal(result.status, 'failed')
  assert.match(result.failure.message, /missing|Collection/i)
  assert.deepEqual(await snapshot(target), {})
})

test('should materialize an archived collection without policy metadata and satisfy the consumer verifier', async () => {
  const packageRoot = join(fixtureRoot, 'package')
  const prefixPath = ppath.resolve('/node_modules/@atls/raijin')
  const consumerRoot = await createTarget('consumer')

  await cp(join(buildRoot, 'dist'), join(packageRoot, 'dist'), { recursive: true })
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      schematics: './dist/generation/project/collection/collection.json',
    })
  )
  await prepareProjectGeneration(consumerRoot)

  const packageFs = await tgzUtils.makeArchiveFromDirectory(npath.toPortablePath(packageRoot), {
    prefixPath,
    inMemory: true,
  })

  try {
    const source = await readSource({ packageFs, prefixPath })

    await materialize(source, async ({ collectionPath: installedCollection }) => {
      const verifyScaffold = async (scaffoldType: 'library' | 'project'): Promise<void> => {
        const target = join(consumerRoot, 'packages/generated')
        const result = await scaffoldProjectWithAngular({
          collectionPath: installedCollection,
          scaffoldType,
          targetPath: target,
        })

        assert.equal(result.status, 'generated', JSON.stringify(result))
        await verifyProjectGeneration(target)
      }

      await verifyScaffold('project')
      await verifyScaffold('library')

      const retiredWorkflow = join(
        consumerRoot,
        'packages/generated/.github/workflows/preview.yaml'
      )

      await writeFile(retiredWorkflow, 'name: Retired generated workflow\n')
      await assert.rejects(
        verifyProjectGeneration(join(consumerRoot, 'packages/generated')),
        /Unexpected generated scaffold files/
      )
    })
  } finally {
    packageFs.discardAndClose()
  }
})
