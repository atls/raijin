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

test('should not reject missing non-target conditional unplugged package payloads', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.cjs'),
    'packageLocation: "./.yarn/unplugged/@esbuild-linux-x64-npm-0.24.2-4423400f4a/node_modules/@esbuild/linux-x64/"'
  )
  await xfs.writeFilePromise(
    ppath.join(cwd, 'yarn.lock'),
    [
      '"@esbuild/linux-x64@npm:0.24.2":',
      '  version: 0.24.2',
      '  resolution: "@esbuild/linux-x64@npm:0.24.2"',
      '  conditions: os=linux & cpu=x64',
      '  languageName: node',
      '  linkType: hard',
    ].join('\n')
  )

  const descriptor = await createProjectDescriptor({
    repo,
    builder,
    envs,
    cwd,
    platform: 'linux/arm64',
  })

  assert.deepEqual(descriptor.io.buildpacks.exclude, ['.git'])
})

test('should reject missing target conditional unplugged package payload', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.cjs'),
    'packageLocation: "./.yarn/unplugged/@esbuild-linux-x64-npm-0.24.2-4423400f4a/node_modules/@esbuild/linux-x64/"'
  )
  await xfs.writeFilePromise(
    ppath.join(cwd, 'yarn.lock'),
    [
      '"@esbuild/linux-x64@npm:0.24.2":',
      '  version: 0.24.2',
      '  resolution: "@esbuild/linux-x64@npm:0.24.2"',
      '  conditions: os=linux & cpu=x64',
      '  languageName: node',
      '  linkType: hard',
    ].join('\n')
  )

  await assert.rejects(
    createProjectDescriptor({
      repo,
      builder,
      envs,
      cwd,
      platform: 'linux/amd64',
    }),
    /PnP manifest references unplugged packages that are missing/
  )
})

test('should not reject missing non-target libc conditional unplugged payload', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.cjs'),
    'packageLocation: "./.yarn/unplugged/@rollup-rollup-linux-x64-musl-npm-4.45.0-7ea6a5f09b/node_modules/@rollup/rollup-linux-x64-musl/"'
  )
  await xfs.writeFilePromise(
    ppath.join(cwd, 'yarn.lock'),
    [
      '"@rollup/rollup-linux-x64-musl@npm:4.45.0":',
      '  version: 4.45.0',
      '  resolution: "@rollup/rollup-linux-x64-musl@npm:4.45.0"',
      '  conditions: os=linux & cpu=x64 & libc=musl',
      '  languageName: node',
      '  linkType: hard',
    ].join('\n')
  )

  const descriptor = await createProjectDescriptor({
    repo,
    builder,
    envs,
    cwd,
    platform: 'linux/amd64',
  })

  assert.deepEqual(descriptor.io.buildpacks.exclude, ['.git'])
})

test('should reject missing requested uncommon cpu conditional unplugged payload', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.cjs'),
    'packageLocation: "./.yarn/unplugged/@rollup-rollup-linux-riscv64-gnu-npm-4.45.0-4c6c3cfa9d/node_modules/@rollup/rollup-linux-riscv64-gnu/"'
  )
  await xfs.writeFilePromise(
    ppath.join(cwd, 'yarn.lock'),
    [
      '"@rollup/rollup-linux-riscv64-gnu@npm:4.45.0":',
      '  version: 4.45.0',
      '  resolution: "@rollup/rollup-linux-riscv64-gnu@npm:4.45.0"',
      '  conditions: os=linux & cpu=riscv64 & libc=glibc',
      '  languageName: node',
      '  linkType: hard',
    ].join('\n')
  )

  await assert.rejects(
    createProjectDescriptor({
      repo,
      builder,
      envs,
      cwd,
      platform: 'linux/riscv64',
    }),
    /PnP manifest references unplugged packages that are missing/
  )
})

test('should reject missing linux 386 target conditional unplugged payload', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.cjs'),
    'packageLocation: "./.yarn/unplugged/@esbuild-linux-ia32-npm-0.24.2-420afcf818/node_modules/@esbuild/linux-ia32/"'
  )
  await xfs.writeFilePromise(
    ppath.join(cwd, 'yarn.lock'),
    [
      '"@esbuild/linux-ia32@npm:0.24.2":',
      '  version: 0.24.2',
      '  resolution: "@esbuild/linux-ia32@npm:0.24.2"',
      '  conditions: os=linux & cpu=ia32',
      '  languageName: node',
      '  linkType: hard',
    ].join('\n')
  )

  await assert.rejects(
    createProjectDescriptor({
      repo,
      builder,
      envs,
      cwd,
      platform: 'linux/386',
    }),
    /PnP manifest references unplugged packages that are missing/
  )
})

test('should not reject missing non-target patched conditional unplugged payload', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.cjs'),
    'packageLocation: "./.yarn/unplugged/fsevents-patch-df0bf1/node_modules/fsevents/"'
  )
  await xfs.writeFilePromise(
    ppath.join(cwd, 'yarn.lock'),
    [
      '"fsevents@patch:fsevents@npm%3A~2.3.2#optional!builtin<compat/fsevents>":',
      '  version: 2.3.3',
      '  resolution: "fsevents@patch:fsevents@npm%3A2.3.3#optional!builtin<compat/fsevents>::version=2.3.3&hash=df0bf1"',
      '  conditions: os=darwin',
      '  languageName: node',
      '  linkType: hard',
    ].join('\n')
  )

  const descriptor = await createProjectDescriptor({
    repo,
    builder,
    envs,
    cwd,
    platform: 'linux/amd64',
  })

  assert.deepEqual(descriptor.io.buildpacks.exclude, ['.git'])
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
