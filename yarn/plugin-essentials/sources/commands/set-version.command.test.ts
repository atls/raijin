import assert                            from 'node:assert/strict'
import { mkdtemp }                       from 'node:fs/promises'
import { mkdir }                         from 'node:fs/promises'
import { access }                        from 'node:fs/promises'
import { writeFile }                     from 'node:fs/promises'
import { tmpdir }                        from 'node:os'
import { join }                          from 'node:path'
import { test }                          from 'node:test'

import { findPackageCwd }                from './set-version.utils.js'
import { preparePackageProjectBoundary } from './set-version.utils.js'

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
