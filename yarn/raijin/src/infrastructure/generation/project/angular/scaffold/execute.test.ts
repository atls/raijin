import assert                  from 'node:assert/strict'
import { execFile }            from 'node:child_process'
import { access }              from 'node:fs/promises'
import { mkdir }               from 'node:fs/promises'
import { readFile }            from 'node:fs/promises'
import { rm }                  from 'node:fs/promises'
import { writeFile }           from 'node:fs/promises'
import { join }                from 'node:path'
import { dirname }             from 'node:path'
import { after }               from 'node:test'
import { before }              from 'node:test'
import { test }                from 'node:test'
import { fileURLToPath }       from 'node:url'
import { promisify }           from 'node:util'

import { xfs }                 from '@yarnpkg/fslib'

import { buildCollection }     from '../artifact/build.js'
import { scaffoldWithAngular } from './execute.js'

const expectedCommonFiles = [
  '/.config/husky/.gitignore',
  '/.config/husky/commit-msg',
  '/.config/husky/pre-commit',
  '/.config/husky/prepare-commit-msg',
  '/.github/workflows/checks.yaml',
  '/.gitignore',
  '/.prettierrc.mjs',
  '/eslint.config.mjs',
  '/tsconfig.json',
]

const execFileAsync = promisify(execFile)
const packageRoot = dirname(fileURLToPath(import.meta.resolve('@atls/raijin/package.json')))

let fixtureRoot = ''
let collectionPath = ''

const createProjectTarget = async (
  name: string,
  scripts?: Record<string, string>
): Promise<string> => {
  const target = join(fixtureRoot, 'nested', name)

  await mkdir(target, { recursive: true })
  await writeFile(
    join(target, 'package.json'),
    `${JSON.stringify({ name, private: true, scripts }, null, 2)}\n`
  )
  await writeFile(
    join(target, 'tsconfig.json'),
    `${JSON.stringify({ compilerOptions: { baseUrl: '.' }, include: ['src'] }, null, 2)}\n`
  )
  await writeFile(join(target, '.gitignore'), 'node_modules\n.idea/\n')

  return target
}

const getChangedPaths = (result: Awaited<ReturnType<typeof scaffoldWithAngular>>): Array<string> =>
  result.changes.map(({ path }) => path).sort()

const assertFileMissing = async (path: string): Promise<void> => {
  await assert.rejects(access(path), { code: 'ENOENT' })
}

before(async () => {
  fixtureRoot = await xfs.mktempPromise()

  await execFileAsync('yarn', ['workspace', '@atls/raijin', 'build:library'], {
    cwd: packageRoot,
    encoding: 'utf8',
  })
  await buildCollection({ packageRoot })
  collectionPath = join(packageRoot, 'dist/generation/project/collection/collection.json')
})

after(async () => {
  await rm(fixtureRoot, { recursive: true, force: true })
})

const assertExactScaffoldFiles = async (scaffoldType: 'library' | 'project'): Promise<void> => {
  const target = await createProjectTarget(`${scaffoldType}-fixture`)
  const result = await scaffoldWithAngular(collectionPath, {
    scaffoldType,
    targetPath: target,
  })
  const scaffoldFiles =
    scaffoldType === 'project'
      ? ['/.github/workflows/preview.yaml', '/.github/workflows/release.yaml']
      : ['/.github/workflows/publish.yaml', '/.github/workflows/version.yaml']

  assert.equal(result.status, 'succeeded')
  assert.deepEqual(getChangedPaths(result), [...expectedCommonFiles, ...scaffoldFiles].sort())
  assert.equal(
    await readFile(join(target, '.prettierrc.mjs'), 'utf-8'),
    "import config from '@atls/raijin/prettier'\n\nexport default config\n"
  )
  assert.equal(
    await readFile(join(target, '.config/husky/pre-commit'), 'utf-8'),
    'yarn commit staged\n'
  )

  const gitIgnore = await readFile(join(target, '.gitignore'), 'utf-8')

  assert.match(gitIgnore, /# raijin:begin project-specific gitignore\n\.idea\/\n/)

  const tsconfig = JSON.parse(await readFile(join(target, 'tsconfig.json'), 'utf-8')) as {
    compilerOptions: Record<string, unknown>
    include: Array<string>
  }

  assert.equal(tsconfig.compilerOptions.baseUrl, '.')
  assert.equal(tsconfig.compilerOptions.module, 'NodeNext')
  assert.deepEqual(tsconfig.include, ['src'])

  if (scaffoldType === 'project') {
    const preview = await readFile(join(target, '.github/workflows/preview.yaml'), 'utf-8')

    assert.match(
      preview,
      /--registry 'eu\.gcr\.io\/\$\{\{ secrets\.GCR_PROJECT_ID \}\}\/project-fixture-'/
    )
    await assertFileMissing(join(target, '.github/workflows/publish.yaml'))
  } else {
    const publish = await readFile(join(target, '.github/workflows/publish.yaml'), 'utf-8')

    assert.match(
      publish,
      /yarn workspaces changed foreach --verbose --topological --no-private npm publish --access public/
    )
    await assertFileMissing(join(target, '.github/workflows/preview.yaml'))
  }
}

test('should generate exact project scaffold files in a nested target', async () => {
  await assertExactScaffoldFiles('project')
})

test('should generate exact library scaffold files in a nested target', async () => {
  await assertExactScaffoldFiles('library')
})

test('should preserve existing workspace package scripts while applying the scaffold', async () => {
  const scripts = {
    build: 'yarn service build',
    dev: 'yarn service dev',
    start: 'yarn node dist/index.js',
  }
  const target = await createProjectTarget('existing-fixture', scripts)
  const result = await scaffoldWithAngular(collectionPath, {
    scaffoldType: 'project',
    targetPath: target,
  })
  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf-8')) as {
    name: string
    scripts: Record<string, string>
  }

  assert.equal(result.status, 'succeeded')
  assert.equal(manifest.name, 'existing-fixture')
  assert.deepEqual(manifest.scripts, scripts)
})

test('should roll back partial tree writes when a schematic rule fails', async () => {
  const target = await createProjectTarget('transaction-fixture')

  const beforeTsconfig = await readFile(join(target, 'tsconfig.json'), 'utf-8')

  await writeFile(join(target, 'package.json'), '{ invalid project manifest')

  const result = await scaffoldWithAngular(collectionPath, {
    scaffoldType: 'project',
    targetPath: target,
  })

  assert.equal(result.status, 'failed')
  assert.equal(result.failure.code, 'project-scaffold-failed')
  assert.equal(await readFile(join(target, 'tsconfig.json'), 'utf-8'), beforeTsconfig)
  await assertFileMissing(join(target, '.prettierrc.mjs'))
  await assertFileMissing(join(target, '.github/workflows/checks.yaml'))
})

test('should return a typed failure for an unavailable collection provider', async () => {
  const target = await createProjectTarget('provider-failure-fixture')
  const result = await scaffoldWithAngular(join(fixtureRoot, 'missing/collection.json'), {
    scaffoldType: 'project',
    targetPath: target,
  })

  assert.equal(result.status, 'failed')
  assert.equal(result.failure.code, 'project-scaffold-failed')
})

test('should reject an invalid scaffold type through the Angular schema without writes', async () => {
  const target = await createProjectTarget('schema-failure-fixture')
  const beforeFiles = await readFile(join(target, 'package.json'), 'utf-8')
  const result = await scaffoldWithAngular(collectionPath, {
    scaffoldType: 'service' as never,
    targetPath: target,
  })

  assert.equal(result.status, 'failed')
  assert.equal(result.failure.code, 'project-scaffold-failed')
  assert.equal(await readFile(join(target, 'package.json'), 'utf-8'), beforeFiles)
  await assertFileMissing(join(target, '.prettierrc.mjs'))
})

test('should return a typed failure for a corrupt collection artifact', async () => {
  const target = await createProjectTarget('corrupt-collection-fixture')
  const corruptCollectionPath = join(fixtureRoot, 'corrupt-collection/collection.json')

  await mkdir(dirname(corruptCollectionPath), { recursive: true })
  await writeFile(corruptCollectionPath, '{ invalid collection')

  const result = await scaffoldWithAngular(corruptCollectionPath, {
    scaffoldType: 'project',
    targetPath: target,
  })

  assert.equal(result.status, 'failed')
  assert.equal(result.failure.code, 'project-scaffold-failed')
  await assertFileMissing(join(target, '.prettierrc.mjs'))
})
