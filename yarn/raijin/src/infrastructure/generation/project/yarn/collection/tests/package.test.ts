import type { FetchResult }  from '@yarnpkg/core'
import type { PortablePath } from '@yarnpkg/fslib'

import assert                from 'node:assert/strict'
import { test }              from 'node:test'

import { CwdFS }             from '@yarnpkg/fslib'
import { NodeFS }            from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

import { materialize }       from '../package.js'
import { readSource }        from '../package.js'

const createInstalledPackage = async (
  root: PortablePath,
  manifest: Record<string, unknown>
): Promise<FetchResult> => {
  const collectionRoot = ppath.join(root, 'dist/generation/project/collection' as PortablePath)

  await xfs.mkdirPromise(collectionRoot, { recursive: true })
  await xfs.writeFilePromise(
    ppath.join(root, 'package.json' as PortablePath),
    `${JSON.stringify(manifest)}\n`
  )
  await xfs.writeFilePromise(
    ppath.join(collectionRoot, 'collection.json' as PortablePath),
    '{"schematics":{}}\n'
  )

  return {
    packageFs: new NodeFS(),
    prefixPath: root,
  }
}

test('should resolve the collection and metadata through packageFs and prefixPath', async () => {
  await xfs.mktempPromise(async (packageRoot) => {
    const fetchResult = await createInstalledPackage(packageRoot, {
      devDependencies: { '@types/node': '24.12.2' },
      schematics: './dist/generation/project/collection/collection.json',
    })
    const source = await readSource(fetchResult)

    assert.equal(
      source.collectionRoot,
      ppath.join(packageRoot, 'dist/generation/project/collection' as PortablePath)
    )
    assert.equal(source.manifest.devDependencies?.['@types/node'], '24.12.2')
  })
})

test('should resolve a collection from a relative package prefix', async () => {
  await xfs.mktempPromise(async (filesystemRoot) => {
    const prefixPath = 'node_modules/@atls/raijin' as PortablePath
    const packageRoot = ppath.join(filesystemRoot, prefixPath)
    const fetchResult = await createInstalledPackage(packageRoot, {
      schematics: './dist/generation/project/collection/collection.json',
    })
    const source = await readSource({
      ...fetchResult,
      packageFs: new CwdFS(filesystemRoot),
      prefixPath,
    })

    assert.equal(
      source.collectionRoot,
      'node_modules/@atls/raijin/dist/generation/project/collection' as PortablePath
    )
  })
})

test('should materialize a virtual collection only for the callback lifetime', async () => {
  await xfs.mktempPromise(async (packageRoot) => {
    const source = await readSource(
      await createInstalledPackage(packageRoot, {
        schematics: './dist/generation/project/collection/collection.json',
      })
    )
    let materializedCollection = ''

    await materialize(source, async ({ collectionPath }) => {
      materializedCollection = collectionPath
      assert.equal(await xfs.existsPromise(collectionPath as PortablePath), true)
    })

    assert.equal(await xfs.existsPromise(materializedCollection as PortablePath), false)
  })
})

test('should reject missing, absolute, and escaping collection metadata', async () => {
  await xfs.mktempPromise(async (packageRoot) => {
    await assert.rejects(
      readSource(await createInstalledPackage(packageRoot, {})),
      /does not declare schematics/
    )

    await assert.rejects(
      readSource(await createInstalledPackage(packageRoot, { schematics: '/tmp/collection.json' })),
      /must be package-relative/
    )

    await assert.rejects(
      readSource(await createInstalledPackage(packageRoot, { schematics: '../collection.json' })),
      /escapes the package/
    )
  })
})
