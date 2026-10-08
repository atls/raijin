import type { Workspace }            from '@yarnpkg/core'

import assert                        from 'node:assert/strict'
import { execFile }                  from 'node:child_process'
import { mkdtemp }                   from 'node:fs/promises'
import { mkdir }                     from 'node:fs/promises'
import { rename }                    from 'node:fs/promises'
import { rm }                        from 'node:fs/promises'
import { writeFile }                 from 'node:fs/promises'
import { tmpdir }                    from 'node:os'
import { join }                      from 'node:path'
import { test }                      from 'node:test'
import { promisify }                 from 'node:util'

import { structUtils }               from '@yarnpkg/core'
import { npath }                     from '@yarnpkg/fslib'

import { recommendWorkspaceVersion } from '../recommend.js'

const execFileAsync = promisify(execFile)

const git = async (cwd: string, ...args: Array<string>): Promise<void> => {
  const inheritedGitState = new Set([
    'GIT_INDEX_FILE',
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_COMMON_DIR',
    'GIT_PREFIX',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  ])
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !inheritedGitState.has(key))
  )

  await execFileAsync('git', args, { cwd, env })
}

const commit = async (
  cwd: string,
  type: string,
  name: string,
  packageName = 'a'
): Promise<void> => {
  const packageCwd = join(cwd, 'packages', packageName)
  await mkdir(packageCwd, { recursive: true })
  await writeFile(join(packageCwd, `${name}.ts`), `export const ${name} = true\n`)
  await git(cwd, 'add', `packages/${packageName}`)
  await git(
    cwd,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    `${type}(${packageName}): ${name}`
  )
}

const workspace = (version: string, name = '@fixture/a', relativeCwd = 'packages/a'): Workspace =>
  ({
    manifest: {
      name: structUtils.parseIdent(name),
      version,
    },
    relativeCwd: npath.toPortablePath(relativeCwd),
  }) as Workspace

const recommend = async (
  root: string,
  candidate: Workspace
): ReturnType<typeof recommendWorkspaceVersion> => recommendWorkspaceVersion(root, candidate)

test('recommends the strongest bump from package commits and respects the current tag', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-bump-'))
  t.after(async () => rm(root, { recursive: true, force: true }))

  await mkdir(join(root, 'packages/a'), { recursive: true })
  await git(root, 'init', '-q')
  await writeFile(
    join(root, 'packages/a/package.json'),
    '{"name":"@fixture/a","version":"0.2.7"}\n'
  )
  await commit(root, 'chore', 'initial')
  await git(root, 'tag', '@fixture/a@0.2.7')

  await commit(root, 'fix', 'repair')
  await commit(root, 'feat', 'feature')
  await commit(root, 'chore', 'metadata')

  assert.equal(await recommend(root, workspace('0.2.7')), 'minor')

  await git(root, 'tag', '@fixture/a@0.3.0')
  await commit(root, 'feat', 'unrelated', 'b')

  assert.equal(await recommend(root, workspace('0.3.0')), null)

  await commit(root, 'chore', 'cleanup')

  assert.equal(await recommend(root, workspace('0.3.0')), 'patch')
  assert.equal(await recommend(root, workspace('0.4.0')), null)
  assert.equal(await recommend(root, workspace('0.1.0', '@fixture/new')), null)

  await writeFile(join(root, 'packages/a', 'breaking.ts'), 'export const breaking = true\n')
  await git(root, 'add', '.')
  await git(
    root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'feat(a)!: change API'
  )

  assert.equal(await recommend(root, workspace('0.3.0')), 'major')
})

test('stops before recording a bump when a package moved since its tag', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-bump-move-'))
  t.after(async () => rm(root, { recursive: true, force: true }))

  await mkdir(join(root, 'packages/a'), { recursive: true })
  await git(root, 'init', '-q')
  await writeFile(
    join(root, 'packages/a/package.json'),
    '{"name":"@fixture/a","version":"1.0.0"}\n'
  )
  await commit(root, 'chore', 'initial')
  await git(root, 'tag', '@fixture/a@1.0.0')

  await writeFile(join(root, 'packages/a/breaking.ts'), 'export const breaking = true\n')
  await git(root, 'add', 'packages/a')
  await git(
    root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'feat(a)!: change API'
  )
  await rename(join(root, 'packages/a'), join(root, 'packages/b'))
  await git(root, 'add', '-A')
  await git(
    root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'chore(a): move package'
  )

  await assert.rejects(
    recommend(root, workspace('1.0.0', '@fixture/a', 'packages/b')),
    /record an explicit Yarn version decision/
  )
})

test('infers a publishable single-package root', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-bump-root-'))
  t.after(async () => rm(root, { recursive: true, force: true }))

  await git(root, 'init', '-q')
  await writeFile(join(root, 'package.json'), '{"name":"@fixture/root","version":"1.0.0"}\n')
  await git(root, 'add', '.')
  await git(
    root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'chore: initial'
  )
  await git(root, 'tag', '@fixture/root@1.0.0')

  await writeFile(join(root, 'root.ts'), 'export const feature = true\n')
  await git(root, 'add', 'root.ts')
  await git(
    root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'feat: root API'
  )

  assert.equal(await recommend(root, workspace('1.0.0', '@fixture/root', '.')), 'minor')
})

test('resolves a tagged manifest from a Yarn project nested below the Git root', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-bump-nested-'))
  t.after(async () => rm(root, { recursive: true, force: true }))

  await mkdir(join(root, 'sub/packages/a'), { recursive: true })
  await git(root, 'init', '-q')
  await writeFile(
    join(root, 'sub/packages/a/package.json'),
    '{"name":"@fixture/a","version":"1.0.0"}\n'
  )
  await git(root, 'add', '.')
  await git(
    root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'chore: initial'
  )
  await git(root, 'tag', '@fixture/a@1.0.0')
  await writeFile(join(root, 'sub/packages/a/feature.ts'), 'export const feature = true\n')
  await git(root, 'add', 'sub/packages/a/feature.ts')
  await git(
    root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'feat(a): nested feature'
  )

  assert.equal(await recommend(join(root, 'sub'), workspace('1.0.0')), 'minor')
})

test('stops when a package moved away and back after its tag', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-bump-roundtrip-'))
  t.after(async () => rm(root, { recursive: true, force: true }))

  await mkdir(join(root, 'packages/a'), { recursive: true })
  await git(root, 'init', '-q')
  await writeFile(
    join(root, 'packages/a/package.json'),
    '{"name":"@fixture/a","version":"1.0.0"}\n'
  )
  await git(root, 'add', '.')
  await git(
    root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'chore: initial'
  )
  await git(root, 'tag', '@fixture/a@1.0.0')

  await git(root, 'mv', 'packages/a', 'packages/b')
  await git(
    root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'chore: move to b'
  )
  await commit(root, 'feat!', 'breaking', 'b')
  await git(root, 'mv', 'packages/b', 'packages/a')
  await git(
    root,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'chore: move back'
  )

  await assert.rejects(
    recommend(root, workspace('1.0.0')),
    /record an explicit Yarn version decision/
  )
})
