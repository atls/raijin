import type { FetchResult }  from '@yarnpkg/core'
import type { Project }      from '@yarnpkg/core'
import type { Workspace }    from '@yarnpkg/core'
import type { PortablePath } from '@yarnpkg/fslib'

import assert                from 'node:assert/strict'
import { test }              from 'node:test'

import { CwdFS }             from '@yarnpkg/fslib'
import { NodeFS }            from '@yarnpkg/fslib'
import { structUtils }       from '@yarnpkg/core'
import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

import { materialize }       from '../package.js'
import { readSource }        from '../package.js'
import { resolvePackage }    from '../package.js'

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

test('should resolve the collection through packageFs and prefixPath without workflow metadata', async () => {
  await xfs.mktempPromise(async (packageRoot) => {
    const fetchResult = await createInstalledPackage(packageRoot, {
      schematics: './dist/generation/project/collection/collection.json',
    })
    const source = await readSource(fetchResult)

    assert.equal(
      source.collectionRoot,
      ppath.join(packageRoot, 'dist/generation/project/collection' as PortablePath)
    )
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

test('should resolve Raijin through the invoking workspace dependency', () => {
  const ident = structUtils.parseIdent('@atls/raijin')
  const rootDescriptor = structUtils.makeDescriptor(ident, 'npm:^0.5.0')
  const workspaceDescriptor = structUtils.makeDescriptor(ident, 'npm:^0.6.4')
  const selected = structUtils.makeLocator(ident, 'npm:0.6.4')
  const root = structUtils.makeLocator(ident, 'npm:0.5.0')
  const rootWorkspace = {
    anchoredPackage: {
      dependencies: new Map([[ident.identHash, rootDescriptor]]),
    },
  } as Workspace
  const workspace = {
    anchoredPackage: {
      dependencies: new Map([[ident.identHash, workspaceDescriptor]]),
    },
  } as Workspace
  const project = {
    topLevelWorkspace: rootWorkspace,
    storedPackages: new Map([
      [root.locatorHash, root],
      [selected.locatorHash, selected],
    ]),
    storedResolutions: new Map([
      [rootDescriptor.descriptorHash, root.locatorHash],
      [workspaceDescriptor.descriptorHash, selected.locatorHash],
    ]),
  } as Project

  assert.equal(resolvePackage({ project, workspace }), selected)
})

test('should fall back to the top-level Raijin dependency', () => {
  const ident = structUtils.parseIdent('@atls/raijin')
  const descriptor = structUtils.makeDescriptor(ident, 'npm:^0.6.4')
  const selected = structUtils.makeLocator(ident, 'npm:0.6.4')
  const topLevelWorkspace = {
    anchoredPackage: {
      dependencies: new Map([[ident.identHash, descriptor]]),
    },
  } as Workspace
  const workspace = {
    anchoredPackage: {
      dependencies: new Map(),
    },
  } as Workspace
  const project = {
    topLevelWorkspace,
    storedPackages: new Map([[selected.locatorHash, selected]]),
    storedResolutions: new Map([[descriptor.descriptorHash, selected.locatorHash]]),
  } as Project

  assert.equal(resolvePackage({ project, workspace }), selected)
})
