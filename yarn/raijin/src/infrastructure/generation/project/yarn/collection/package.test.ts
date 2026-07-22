import type { PortablePath }              from '@yarnpkg/fslib'

import assert                             from 'node:assert/strict'
import { access }                         from 'node:fs/promises'
import { mkdir }                          from 'node:fs/promises'
import { writeFile }                      from 'node:fs/promises'
import { test }                           from 'node:test'

import { NodeFS }                         from '@yarnpkg/fslib'
import { npath }                          from '@yarnpkg/fslib'
import { ppath }                          from '@yarnpkg/fslib'
import { xfs }                            from '@yarnpkg/fslib'

import { CollectionUnavailableException } from './package.js'
import { resolvePackageSource }           from './package.js'
import { withMaterializedCollection }     from './package.js'

const createPackageCollection = async (root: PortablePath): Promise<PortablePath> => {
  const collection = ppath.join(root, 'collection' as PortablePath)

  await mkdir(npath.fromPortablePath(collection), { recursive: true })
  await writeFile(
    npath.fromPortablePath(ppath.join(collection, 'collection.json' as PortablePath)),
    '{"schematics":{}}\n'
  )

  return collection
}

test('should materialize a package collection for the callback and clean it afterward', async () => {
  await xfs.mktempPromise(async (root) => {
    const packageCollectionPath = await createPackageCollection(root)
    let materializedCollectionPath = ''

    await withMaterializedCollection(
      {
        packageCollectionPath,
        packageFs: new NodeFS(),
      },
      async (collectionPath) => {
        materializedCollectionPath = collectionPath
        await access(collectionPath)
      }
    )

    await assert.rejects(access(materializedCollectionPath), { code: 'ENOENT' })
  })
})

test('should clean the materialized collection when the provider callback fails', async () => {
  await xfs.mktempPromise(async (root) => {
    const packageCollectionPath = await createPackageCollection(root)
    let materializedCollectionPath = ''
    const callbackError = new Error('provider callback failure')

    await assert.rejects(
      withMaterializedCollection(
        {
          packageCollectionPath,
          packageFs: new NodeFS(),
        },
        async (collectionPath) => {
          materializedCollectionPath = collectionPath
          throw callbackError
        }
      ),
      (error) => error === callbackError
    )

    await assert.rejects(access(materializedCollectionPath), { code: 'ENOENT' })
  })
})

test('should classify an unavailable package collection at the materialization boundary', async () => {
  await xfs.mktempPromise(async (root) => {
    const missingCollection = ppath.join(root, 'missing' as PortablePath)

    await assert.rejects(
      withMaterializedCollection(
        {
          packageCollectionPath: missingCollection,
          packageFs: new NodeFS(),
        },
        async () => undefined
      ),
      CollectionUnavailableException
    )
  })
})

test('should resolve the collection directory from package schematics metadata', async () => {
  await xfs.mktempPromise(async (root) => {
    const packageRoot = ppath.join(root, 'package' as PortablePath)

    await mkdir(npath.fromPortablePath(packageRoot), { recursive: true })
    await writeFile(
      npath.fromPortablePath(ppath.join(packageRoot, 'package.json' as PortablePath)),
      '{"schematics":"./dist/generation/project/collection/collection.json"}\n'
    )

    const source = await resolvePackageSource({
      checksum: null,
      localPath: null,
      packageFs: new NodeFS(),
      prefixPath: packageRoot,
      releaseFs: undefined,
    })

    assert.equal(
      source.packageCollectionPath,
      ppath.join(packageRoot, 'dist/generation/project/collection' as PortablePath)
    )
  })
})
