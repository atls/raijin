import assert                         from 'node:assert/strict'
import { access }                     from 'node:fs/promises'
import { mkdir }                      from 'node:fs/promises'
import { readFile }                   from 'node:fs/promises'
import { rm }                         from 'node:fs/promises'
import { writeFile }                  from 'node:fs/promises'
import { dirname }                    from 'node:path'
import { join }                       from 'node:path'
import { after }                      from 'node:test'
import { before }                     from 'node:test'
import { test }                       from 'node:test'
import { fileURLToPath }              from 'node:url'

import { xfs }                        from '@yarnpkg/fslib'

import { buildProjectCollection }     from '../../../../../scripts/generation/project/build.js'
import { scaffoldProjectWithAngular } from './scaffold.js'

const generatedWorkflowPolicy = {
  checkoutAction: 'actions/checkout@v6',
  containerRegistry: 'ghcr.io',
  containerRepositoryExpression: 'github.repository',
  nodeVersion: '24',
  npmTokenSecret: 'NPM_TOKEN',
  setupNodeAction: 'actions/setup-node@v6',
}

const packageRoot = dirname(fileURLToPath(import.meta.resolve('@atls/raijin/package.json')))

let collectionPath = ''
let fixtureRoot = ''

const createTarget = async (
  name: string,
  { gitIgnore = 'node_modules\n.idea/\n', invalidTypeScript = false } = {}
): Promise<string> => {
  const target = join(fixtureRoot, name)

  await mkdir(target, { recursive: true })
  await writeFile(
    join(target, 'package.json'),
    `${JSON.stringify(
      {
        name: `fixture-${name}`,
        private: true,
        scripts: { start: 'yarn node dist/index.js' },
      },
      null,
      2
    )}\n`
  )
  await writeFile(
    join(target, 'tsconfig.json'),
    invalidTypeScript
      ? '{ invalid TypeScript configuration'
      : `${JSON.stringify({ compilerOptions: { baseUrl: '.' }, include: ['src'] }, null, 2)}\n`
  )

  if (gitIgnore !== '') {
    await writeFile(join(target, '.gitignore'), gitIgnore)
  }

  return target
}

const assertMissing = async (path: string): Promise<void> => {
  await assert.rejects(access(path), { code: 'ENOENT' })
}

before(async () => {
  fixtureRoot = await xfs.mktempPromise()
  await buildProjectCollection({ packageRoot })
  collectionPath = join(packageRoot, 'dist/generation/project/collection/collection.json')
})

after(async () => {
  await rm(fixtureRoot, { recursive: true, force: true })
  await rm(join(packageRoot, 'dist'), { recursive: true, force: true })
})

test('should generate the project variant and preserve unrelated existing project state', async () => {
  const target = await createTarget('project')
  const originalGitIgnore = await readFile(join(target, '.gitignore'), 'utf8')
  const originalManifest = await readFile(join(target, 'package.json'), 'utf8')
  const result = await scaffoldProjectWithAngular({
    collectionPath,
    policy: generatedWorkflowPolicy,
    scaffoldType: 'project',
    targetPath: target,
  })

  assert.equal(result.status, 'generated', JSON.stringify(result, null, 2))
  assert.equal(await readFile(join(target, '.gitignore'), 'utf8'), originalGitIgnore)
  assert.equal(await readFile(join(target, 'package.json'), 'utf8'), originalManifest)
  assert.equal(
    await readFile(join(target, '.prettierrc.mjs'), 'utf8'),
    "import config from '@atls/raijin/prettier'\n\nexport default config\n"
  )

  const tsconfig = JSON.parse(await readFile(join(target, 'tsconfig.json'), 'utf8')) as {
    compilerOptions: Record<string, unknown>
    include: Array<string>
  }
  const preview = await readFile(join(target, '.github/workflows/preview.yaml'), 'utf8')
  const release = await readFile(join(target, '.github/workflows/release.yaml'), 'utf8')

  assert.equal(tsconfig.compilerOptions.baseUrl, '.')
  assert.equal(tsconfig.compilerOptions.module, 'NodeNext')
  assert.deepEqual(tsconfig.include, ['src'])
  assert.match(preview, /actions\/checkout@v6/)
  assert.match(preview, /actions\/setup-node@v6/)
  assert.match(preview, /node-version: '24'/)
  assert.match(preview, /docker login ghcr\.io/)
  assert.match(preview, /--registry "ghcr\.io\/\$\{repository\}-"/)
  assert.match(release, /docker login ghcr\.io/)
  assert.doesNotMatch(`${preview}\n${release}`, /18\.19|eu\.gcr\.io|GCR_KEYFILE|GCR_PROJECT_ID/)
  await assertMissing(join(target, '.github/workflows/publish.yaml'))

  const repeatedResult = await scaffoldProjectWithAngular({
    collectionPath,
    policy: generatedWorkflowPolicy,
    scaffoldType: 'project',
    targetPath: target,
  })

  assert.deepEqual(repeatedResult, { status: 'generated', changes: [] })
})

test('should generate the library variant and the current npm token contract', async () => {
  const target = await createTarget('library', { gitIgnore: '' })
  const result = await scaffoldProjectWithAngular({
    collectionPath,
    policy: generatedWorkflowPolicy,
    scaffoldType: 'library',
    targetPath: target,
  })

  assert.equal(result.status, 'generated', JSON.stringify(result, null, 2))
  assert.match(await readFile(join(target, '.gitignore'), 'utf8'), /node_modules/)

  const publish = await readFile(join(target, '.github/workflows/publish.yaml'), 'utf8')
  const version = await readFile(join(target, '.github/workflows/version.yaml'), 'utf8')

  assert.match(publish, /YARN_NPM_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/)
  assert.match(`${publish}\n${version}`, /actions\/checkout@v6/)
  assert.match(`${publish}\n${version}`, /actions\/setup-node@v6/)
  assert.doesNotMatch(`${publish}\n${version}`, /18\.19|secrets\.NPM_AUTH_TOKEN/)
  await assertMissing(join(target, '.github/workflows/preview.yaml'))
})

test('should leave the target untouched when an Angular rule fails', async () => {
  const target = await createTarget('transaction', { invalidTypeScript: true })
  const originalTypeScript = await readFile(join(target, 'tsconfig.json'), 'utf8')
  const result = await scaffoldProjectWithAngular({
    collectionPath,
    policy: generatedWorkflowPolicy,
    scaffoldType: 'project',
    targetPath: target,
  })

  assert.equal(result.status, 'failed')
  assert.match(result.failure.message, /Unexpected token|JSON/)
  assert.equal(await readFile(join(target, 'tsconfig.json'), 'utf8'), originalTypeScript)
  await assertMissing(join(target, '.prettierrc.mjs'))
  await assertMissing(join(target, '.github/workflows/checks.yaml'))
})

test('should return the actual collection provider failure', async () => {
  const target = await createTarget('missing-collection')
  const result = await scaffoldProjectWithAngular({
    collectionPath: join(fixtureRoot, 'missing/collection.json'),
    policy: generatedWorkflowPolicy,
    scaffoldType: 'project',
    targetPath: target,
  })

  assert.equal(result.status, 'failed')
  assert.match(result.failure.message, /missing|Collection/i)
  await assertMissing(join(target, '.prettierrc.mjs'))
})
