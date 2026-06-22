import assert                            from 'node:assert/strict'
import { access }                        from 'node:fs/promises'
import { mkdtemp }                       from 'node:fs/promises'
import { mkdir }                         from 'node:fs/promises'
import { readdir }                       from 'node:fs/promises'
import { readFile }                      from 'node:fs/promises'
import { writeFile }                     from 'node:fs/promises'
import { tmpdir }                        from 'node:os'
import { join }                          from 'node:path'
import { test }                          from 'node:test'

import { createSha256Digest }            from '@atls/raijin/runtime'
import { getRaijinRuntimeYarnPath }      from '@atls/raijin/runtime'
import { parseRaijinRuntimeManifest }    from '@atls/raijin/runtime'

import { resolveYarnPath }               from './set-version.runtime.js'
import { writeRuntimeFileAtomically }    from './set-version.runtime.js'
import { findPackageCwd }                from './set-version.utils.js'
import { nativeToPortablePath }          from './set-version.utils.js'
import { normalizePackageManager }       from './set-version.utils.js'
import { portableToNativePath }          from './set-version.utils.js'
import { preparePackageProjectBoundary } from './set-version.utils.js'

const TEST_PACKAGE_MANAGER = 'yarn@4.14.1'

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

test('should resolve nested package cwd from package child directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-set-version-'))
  const packageCwd = join(root, 'backend/wallet')
  const packageChildCwd = join(packageCwd, 'src/app')

  await mkdir(packageChildCwd, { recursive: true })
  await writeFile(join(root, 'package.json'), `${JSON.stringify({ private: true })}\n`)
  await writeFile(
    join(packageCwd, 'package.json'),
    `${JSON.stringify({
      name: 'wallet',
      private: true,
    })}\n`
  )

  assert.equal(await findPackageCwd(packageChildCwd), packageCwd)
})

test('should create yarn lock in package cwd without touching repo root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-set-version-'))
  const packageCwd = join(root, 'backend/wallet')

  await mkdir(packageCwd, { recursive: true })
  await writeFile(join(root, 'package.json'), `${JSON.stringify({ private: true })}\n`)
  await writeFile(
    join(packageCwd, 'package.json'),
    `${JSON.stringify({
      name: 'wallet',
      private: true,
    })}\n`
  )

  await preparePackageProjectBoundary(packageCwd)

  assert.equal(await exists(join(packageCwd, 'yarn.lock')), true)
  assert.equal(await exists(join(root, 'yarn.lock')), false)
})

test('should normalize package manager without touching package fields', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-set-version-'))
  const manifest = {
    name: 'wallet',
    packageManager: 'yarn@4.12.0',
    private: true,
    scripts: {
      check: 'raijin check',
    },
  }

  await writeFile(join(cwd, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  await normalizePackageManager(cwd, TEST_PACKAGE_MANAGER)

  assert.deepEqual(JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')), {
    ...manifest,
    packageManager: TEST_PACKAGE_MANAGER,
  })
})

test('should reject cwd without package manifest ancestor', async () => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-set-version-'))
  const packageChildCwd = join(root, 'backend/wallet/src/app')

  await mkdir(packageChildCwd, { recursive: true })

  await assert.rejects(
    findPackageCwd(packageChildCwd),
    /Package manifest was not found in current directory or its ancestors/
  )
})

test('should convert between windows native and portable paths', () => {
  assert.equal(
    portableToNativePath('/C:/repo/backend/wallet', 'win32'),
    'C:\\repo\\backend\\wallet'
  )
  assert.equal(
    nativeToPortablePath('C:\\repo\\backend\\wallet', 'win32'),
    '/C:/repo/backend/wallet'
  )
  assert.equal(
    portableToNativePath('/unc/server/share/backend/wallet', 'win32'),
    '\\\\server\\share\\backend\\wallet'
  )
  assert.equal(
    nativeToPortablePath('\\\\server\\share\\backend\\wallet', 'win32'),
    '/unc/server/share/backend/wallet'
  )
})

test('should parse Raijin runtime manifest', () => {
  assert.deepEqual(
    parseRaijinRuntimeManifest({
      schemaVersion: 1,
      packageName: '@atls/yarn-cli',
      packageManager: 'yarn@4.15.0',
      version: '1.2.3',
      tagName: '@atls/yarn-cli@1.2.3',
      assetName: 'yarn.mjs',
      assetUrl:
        'https://github.com/atls/raijin/releases/download/%40atls%2Fyarn-cli%401.2.3/yarn.mjs',
      sha256: 'a'.repeat(64),
    }),
    {
      schemaVersion: 1,
      packageName: '@atls/yarn-cli',
      packageManager: 'yarn@4.15.0',
      version: '1.2.3',
      tagName: '@atls/yarn-cli@1.2.3',
      assetName: 'yarn.mjs',
      assetUrl:
        'https://github.com/atls/raijin/releases/download/%40atls%2Fyarn-cli%401.2.3/yarn.mjs',
      sha256: 'a'.repeat(64),
    }
  )
})

test('should reject runtime manifest from another package', () => {
  assert.throws(
    () =>
      parseRaijinRuntimeManifest({
        schemaVersion: 1,
        packageName: '@atls/yarn-plugin-release',
        version: '1.2.3',
        tagName: '@atls/yarn-plugin-release@1.2.3',
        assetName: 'yarn.mjs',
        assetUrl: 'https://github.com/atls/raijin/releases/download/plugin/yarn.mjs',
        sha256: 'a'.repeat(64),
      }),
    /expected @atls\/yarn-cli/
  )
})

test('should reject runtime manifest with invalid digest', () => {
  assert.throws(
    () =>
      parseRaijinRuntimeManifest({
        schemaVersion: 1,
        packageName: '@atls/yarn-cli',
        version: '1.2.3',
        tagName: '@atls/yarn-cli@1.2.3',
        assetName: 'yarn.mjs',
        assetUrl: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
        sha256: 'not-a-digest',
      }),
    /invalid sha256/
  )
})

test('should create runtime digest', () => {
  assert.equal(
    createSha256Digest(Buffer.from('runtime')),
    'd92c6a81b2ff50096bcda80885427d1f59a25b5f483f7055523504925d16ab23'
  )
})

test('should resolve Raijin runtime yarn path to mjs file', () => {
  assert.equal(getRaijinRuntimeYarnPath(), '.yarn/releases/yarn.mjs')
})

test('should resolve relative yarn path from package cwd', () => {
  assert.equal(
    resolveYarnPath('/repo/backend/wallet', '.yarn/releases/yarn.mjs'),
    '/repo/backend/wallet/.yarn/releases/yarn.mjs'
  )
})

test('should replace active runtime atomically without leaving temporary files', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-set-version-'))
  const releaseDirectory = join(cwd, '.yarn/releases')
  const runtimePath = join(releaseDirectory, 'yarn.mjs')

  await mkdir(releaseDirectory, { recursive: true })
  await writeFile(runtimePath, 'old-runtime')

  await writeRuntimeFileAtomically(runtimePath, Buffer.from('runtime'))

  assert.equal(await readFile(runtimePath, 'utf-8'), 'runtime')
  assert.deepEqual(await readdir(releaseDirectory), ['yarn.mjs'])
})

test('should normalize package manager from runtime manifest', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-set-version-'))
  const manifest = {
    name: 'wallet',
    packageManager: 'yarn@4.12.0',
    private: true,
  }
  const packageManager = 'yarn@4.15.0'

  await writeFile(join(cwd, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  await normalizePackageManager(cwd, packageManager)

  assert.deepEqual(JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')), {
    ...manifest,
    packageManager,
  })
})
