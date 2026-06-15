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

test('should keep same-name unconditional unplugged package payload required', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(ppath.join(cwd, '.pnp.cjs'), 'module.exports = {}')
  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.data.json'),
    JSON.stringify({
      packageRegistryData: [
        [
          'same-package',
          [
            [
              'npm:1.0.0',
              {
                packageLocation:
                  './.yarn/unplugged/same-package-npm-1.0.0-required/node_modules/same-package/',
              },
            ],
          ],
        ],
      ],
    })
  )
  await xfs.writeFilePromise(
    ppath.join(cwd, 'yarn.lock'),
    [
      '"same-package@npm:1.0.0":',
      '  version: 1.0.0',
      '  resolution: "same-package@npm:1.0.0"',
      '  languageName: node',
      '  linkType: hard',
      '',
      '"same-package@npm:2.0.0":',
      '  version: 2.0.0',
      '  resolution: "same-package@npm:2.0.0"',
      '  conditions: os=darwin',
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

test('should filter same-name non-target conditional unplugged package by locator', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(ppath.join(cwd, '.pnp.cjs'), 'module.exports = {}')
  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.data.json'),
    JSON.stringify({
      packageRegistryData: [
        [
          'same-package',
          [
            [
              'npm:2.0.0',
              {
                packageLocation:
                  './.yarn/unplugged/same-package-npm-2.0.0-optional/node_modules/same-package/',
              },
            ],
          ],
        ],
      ],
    })
  )
  await xfs.writeFilePromise(
    ppath.join(cwd, 'yarn.lock'),
    [
      '"same-package@npm:1.0.0":',
      '  version: 1.0.0',
      '  resolution: "same-package@npm:1.0.0"',
      '  languageName: node',
      '  linkType: hard',
      '',
      '"same-package@npm:2.0.0":',
      '  version: 2.0.0',
      '  resolution: "same-package@npm:2.0.0"',
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

test('should reject missing windows target conditional unplugged payload', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.cjs'),
    'packageLocation: "./.yarn/unplugged/@esbuild-win32-x64-npm-0.24.2-4423400f4a/node_modules/@esbuild/win32-x64/"'
  )
  await xfs.writeFilePromise(
    ppath.join(cwd, 'yarn.lock'),
    [
      '"@esbuild/win32-x64@npm:0.24.2":',
      '  version: 0.24.2',
      '  resolution: "@esbuild/win32-x64@npm:0.24.2"',
      '  conditions: os=win32 & cpu=x64',
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
      platform: 'windows/amd64',
    }),
    /PnP manifest references unplugged packages that are missing/
  )
})

test('should reject missing endian aliased target conditional unplugged payloads', async () => {
  const cases = [
    {
      packageName: '@esbuild/linux-mips64el',
      platform: 'linux/mips64le',
      targetCpu: 'mips64el',
      unpluggedFolder: '@esbuild-linux-mips64el-npm-0.24.2-4423400f4a',
    },
    {
      packageName: '@esbuild/linux-ppc64',
      platform: 'linux/ppc64le',
      targetCpu: 'ppc64',
      unpluggedFolder: '@esbuild-linux-ppc64-npm-0.24.2-4423400f4a',
    },
  ]

  await Promise.all(
    cases.map(async ({ packageName, platform, targetCpu, unpluggedFolder }) => {
      const cwd = await xfs.mktempPromise()

      await xfs.writeFilePromise(
        ppath.join(cwd, '.pnp.cjs'),
        `packageLocation: "./.yarn/unplugged/${unpluggedFolder}/node_modules/${packageName}/"`
      )
      await xfs.writeFilePromise(
        ppath.join(cwd, 'yarn.lock'),
        [
          `"${packageName}@npm:0.24.2":`,
          '  version: 0.24.2',
          `  resolution: "${packageName}@npm:0.24.2"`,
          `  conditions: os=linux & cpu=${targetCpu}`,
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
          platform,
        }),
        /PnP manifest references unplugged packages that are missing/
      )
    })
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

test('should match virtual unplugged entries to lockfile conditional locator', async () => {
  const cwd = await xfs.mktempPromise()
  const unpluggedPackagePath = '.yarn/unplugged/fsevents-npm-2.3.3-df0bf1/node_modules/fsevents'

  await xfs.writeFilePromise(ppath.join(cwd, '.pnp.cjs'), 'module.exports = {}')
  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.data.json'),
    JSON.stringify({
      packageRegistryData: [
        [
          'fsevents',
          [
            [
              'npm:2.3.3',
              {
                packageLocation: `./${unpluggedPackagePath}/`,
              },
            ],
            [
              'virtual:peer-hash#npm:2.3.3',
              {
                packageLocation: `./${unpluggedPackagePath}/`,
              },
            ],
          ],
        ],
      ],
    })
  )
  await xfs.writeFilePromise(
    ppath.join(cwd, 'yarn.lock'),
    [
      '"fsevents@npm:2.3.3":',
      '  version: 2.3.3',
      '  resolution: "fsevents@npm:2.3.3"',
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

test('should reject image pack context with missing custom unplugged package payload', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.writeFilePromise(ppath.join(cwd, '.yarnrc.yml'), 'pnpUnpluggedFolder: .pnp-unplugged')
  await xfs.writeFilePromise(
    ppath.join(cwd, '.pnp.cjs'),
    'packageLocation: "./.pnp-unplugged/open-npm-8.4.0-df63cfe537/node_modules/open/"'
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

test('should reject missing target compound conditional unplugged payload', async () => {
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
      '  conditions: (os=linux | os=darwin) & !cpu=arm64',
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
