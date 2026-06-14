import assert                        from 'node:assert/strict'
import test                          from 'node:test'

import { xfs }                       from '@yarnpkg/fslib'
import { ppath }                     from '@yarnpkg/fslib'

import { createProjectDescriptor }   from '../src/pack-descriptor.utils.js'
import { getPnpUnpluggedReferences } from '../src/pack-descriptor.utils.js'

const repo = 'service'
const builder = 'builder'
const envs = [
  {
    name: 'WORKSPACE',
    value: '@atls/service',
  },
]

test('should keep excluding unplugged when PnP manifest has no unplugged references', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(ppath.join(cwd, '.pnp.cjs'), 'module.exports = {}')

  const descriptor = await createProjectDescriptor({
    repo,
    builder,
    envs,
    cwd,
  })

  assert.deepEqual(descriptor.io.buildpacks.exclude, ['.git', '.yarn/unplugged'])
})

test('should preserve unplugged when PnP manifest references unplugged package payload', async () => {
  const cwd = await xfs.mktempPromise()
  const unpluggedPackagePath = '.yarn/unplugged/open-npm-8.4.0-df63cfe537/node_modules/open'

  await xfs.mkdirpPromise(ppath.join(cwd, unpluggedPackagePath))
  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.cjs'),
    `packageLocation: "./${unpluggedPackagePath}/"`
  )

  const descriptor = await createProjectDescriptor({
    repo,
    builder,
    envs,
    cwd,
  })

  assert.deepEqual(descriptor.io.buildpacks.exclude, ['.git'])
})

test('should read split PnP data before excluding unplugged', async () => {
  const cwd = await xfs.mktempPromise()
  const unpluggedPackagePath = '.yarn/unplugged/open-npm-8.4.0-df63cfe537/node_modules/open'

  await xfs.mkdirpPromise(ppath.join(cwd, unpluggedPackagePath))
  await xfs.writeFilePromise(ppath.join(cwd, '.pnp.cjs'), 'module.exports = {}')
  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.data.json'),
    JSON.stringify({
      packageRegistryData: [
        [
          'open',
          [
            [
              'npm:8.4.0',
              {
                packageLocation: `./${unpluggedPackagePath}/`,
              },
            ],
          ],
        ],
      ],
    })
  )

  const descriptor = await createProjectDescriptor({
    repo,
    builder,
    envs,
    cwd,
  })

  assert.deepEqual(descriptor.io.buildpacks.exclude, ['.git'])
})

test('should normalize absolute runtime unplugged references before integrity check', () => {
  assert.deepEqual(
    getPnpUnpluggedReferences(
      'packageLocation: "/workspace/.yarn/unplugged/open-npm-8.4.0-df63cfe537/node_modules/open/"'
    ),
    ['.yarn/unplugged/open-npm-8.4.0-df63cfe537/node_modules/open']
  )
})

test('should reject image pack context with missing unplugged package payload', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.cjs'),
    'packageLocation: "./.yarn/unplugged/open-npm-8.4.0-df63cfe537/node_modules/open/"'
  )

  await assert.rejects(
    createProjectDescriptor({
      repo,
      builder,
      envs,
      cwd,
    }),
    /PnP manifest references unplugged packages that are missing/
  )
})
