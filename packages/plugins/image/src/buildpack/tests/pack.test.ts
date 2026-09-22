import type { CommandExecutor } from '../executor.interfaces.js'

import assert                   from 'node:assert/strict'
import test                     from 'node:test'

import { npath }                from '@yarnpkg/fslib'
import { ppath }                from '@yarnpkg/fslib'
import { xfs }                  from '@yarnpkg/fslib'

import { pack }                 from '../pack.js'

const cwd = npath.toPortablePath('/workspace')

const createCommandExecutor = (execute: CommandExecutor['execute']): CommandExecutor => ({
  cwd,
  execute,
})

test('should build from the project root and consume the native local image report', async () => {
  await xfs.mktempPromise(async (projectCwd) => {
    const descriptorPath = ppath.join(projectCwd, 'project.toml')
    const descriptor = '[io.buildpacks]\nexclude = ["local-only.txt"]\n'
    const image = 'registry.example/atls-example'
    const revision = '0123456789abcdef0123456789abcdef01234567'
    const tags = [
      `${image}:${revision}`,
      `${image}:latest`,
      `${image}:stage`,
      `${image}:${revision}-production`,
    ]
    const calls: Array<{ command: string; args: Array<string> }> = []
    let reportPath = cwd

    await xfs.writeFilePromise(descriptorPath, descriptor)
    await xfs.writeFilePromise(ppath.join(projectCwd, '.pnp.cjs'), 'not parsed by image packaging')

    const executor = createCommandExecutor(async (command, args) => {
      calls.push({ command, args })

      if (command === 'git') {
        return { exitCode: 0, stderr: '', stdout: `${revision}\n` }
      }

      assert.equal(command, 'pack')
      reportPath = npath.toPortablePath(args[args.indexOf('--report-output-dir') + 1])
      await xfs.writeFilePromise(
        reportPath,
        `[image]\ntags = ${JSON.stringify(tags)}\nimage-id = "local-image-id"\n`
      )

      return { exitCode: 0, stderr: '', stdout: '' }
    })

    const result = await pack(
      {
        workspace: '@atls/example',
        registry: 'registry.example/',
        publish: false,
        tagPolicy: 'revision',
        additionalTags: ['stage'],
        tagSuffixes: ['production'],
        builder: 'example/builder',
        buildpack: 'example/buildpack',
        platform: 'linux/arm64',
        cwd: projectCwd,
      },
      executor
    )

    assert.equal(calls.length, 2)
    const { args } = calls[1]

    assert.equal(args[args.indexOf('--path') + 1], npath.fromPortablePath(projectCwd))
    assert.equal(args[args.indexOf('--descriptor') + 1], npath.fromPortablePath(descriptorPath))
    assert.equal(args[args.indexOf('--platform') + 1], 'linux/arm64')
    assert.equal(args[args.indexOf('--env') + 1], 'WORKSPACE=@atls/example')
    assert.equal(args.includes('--publish'), false)
    assert.equal(args.includes('--clear-cache'), false)
    assert.deepEqual(
      args.filter((_value, index) => args[index - 1] === '--tag'),
      tags.slice(1)
    )
    assert.deepEqual(result, {
      workspace: '@atls/example',
      tags,
      published: false,
      imageId: 'local-image-id',
    })
    assert.equal(await xfs.readFilePromise(descriptorPath, 'utf8'), descriptor)
    assert.equal(await xfs.existsPromise(ppath.dirname(reportPath)), false)
  })
})

test('should publish explicit tags without Git and return the provider digest', async () => {
  await xfs.mktempPromise(async (projectCwd) => {
    const calls: Array<string> = []
    const tags = ['registry.example/atls-example:release']
    const digest = 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    let reportPath = cwd
    const executor = createCommandExecutor(async (command, args) => {
      calls.push(command)
      assert.equal(command, 'pack')
      assert.equal(args.includes('--publish'), true)
      assert.equal(args.includes('--descriptor'), false)
      assert.equal(args.includes('--tag'), false)
      assert.equal(args[1], tags[0])
      reportPath = npath.toPortablePath(args[args.indexOf('--report-output-dir') + 1])
      await xfs.writeFilePromise(
        reportPath,
        `[image]\ntags = ${JSON.stringify(tags)}\ndigest = "${digest}"\n`
      )

      return { exitCode: 0, stderr: '', stdout: '' }
    })

    const result = await pack(
      {
        workspace: '@atls/example',
        registry: 'registry.example/',
        publish: true,
        tagPolicy: 'explicit',
        additionalTags: ['release'],
        builder: 'example/builder',
        buildpack: 'example/buildpack',
        cwd: projectCwd,
      },
      executor
    )

    assert.deepEqual(calls, ['pack'])
    assert.deepEqual(result, { workspace: '@atls/example', tags, published: true, digest })
    assert.equal(await xfs.existsPromise(ppath.dirname(reportPath)), false)
  })
})

test('should reject invalid explicit tags before calling a provider', async () => {
  const executor = createCommandExecutor(async () => assert.fail('provider must not run'))

  await assert.rejects(
    pack(
      {
        workspace: '@atls/example',
        registry: '',
        publish: false,
        tagPolicy: 'explicit',
        builder: 'example/builder',
        buildpack: 'example/buildpack',
        cwd,
      },
      executor
    ),
    /Explicit tag policy requires --tags/
  )
})

for (const scenario of [
  {
    name: 'provider failure',
    exitCode: 17,
    stderr: 'build failed',
    report: '',
    publish: false,
    error: /exit code 17\nbuild failed/,
  },
  {
    name: 'missing local identity',
    exitCode: 0,
    stderr: '',
    report: '[image]\ntags = ["example:release"]\n',
    publish: false,
    error: /local image ID/,
  },
  {
    name: 'missing published digest',
    exitCode: 0,
    stderr: '',
    report: '[image]\ntags = ["example:release"]\n',
    publish: true,
    error: /published image digest/,
  },
]) {
  test(`should clean its report directory after ${scenario.name}`, async () => {
    let reportPath = cwd
    const executor = createCommandExecutor(async (command, args) => {
      assert.equal(command, 'pack')
      reportPath = npath.toPortablePath(args[args.indexOf('--report-output-dir') + 1])

      if (scenario.report) {
        await xfs.writeFilePromise(reportPath, scenario.report)
      }

      return { exitCode: scenario.exitCode, stderr: scenario.stderr, stdout: '' }
    })

    await assert.rejects(
      pack(
        {
          workspace: '@atls/example',
          registry: '',
          publish: scenario.publish,
          tagPolicy: 'explicit',
          additionalTags: ['release'],
          builder: 'example/builder',
          buildpack: 'example/buildpack',
          cwd,
        },
        executor
      ),
      scenario.error
    )

    assert.equal(await xfs.existsPromise(ppath.dirname(reportPath)), false)
  })
}
