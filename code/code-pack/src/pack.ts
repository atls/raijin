import type { PackOptions } from './pack.interfaces.js'
import type { PackOutputs } from './pack.interfaces.js'

import { readFileSync }     from 'node:fs'

import { stringify }        from '@iarna/toml'
import { execUtils }        from '@yarnpkg/core'
import { xfs }              from '@yarnpkg/fslib'
import { ppath }            from '@yarnpkg/fslib'

import { installPack }      from './pack.utils.js'
import { getTag }           from './tag.utils.js'

export const pack = async (
  {
    workspace,
    registry,
    publish,
    tagPolicy,
    builder,
    buildpack,
    platform,
    require,
    cwd,
  }: PackOptions,
  context: execUtils.PipevpOptions
): Promise<PackOutputs> => {
  const repo = workspace.replace('@', '').replace(/\//g, '-')
  const image = `${registry}${repo}`

  const tag = await getTag(tagPolicy)

  const envs = [
    {
      name: 'WORKSPACE',
      value: workspace,
    },
    {
      name: 'CNB_USER_ID',
      value: '1001',
    },
  ]

  if (require && require.length > 0) {
    envs.push({
      name: 'BP_REQUIRE',
      value: require.join(','),
    })
  }

  const descriptor = {
    _: {
      'schema-version': '0.2',
      id: repo,
      name: repo,
      version: '0.0.1',
    },
    io: {
      buildpacks: {
        exclude: ['.git', '.yarn/unplugged'],
        builder,
        build: {
          env: envs,
        },
      },
    },
  }

  const descriptorPath = ppath.join(await xfs.mktempPromise(), 'project.toml')

  await xfs.writeFilePromise(descriptorPath, stringify(descriptor))

  console.debug('project.toml', readFileSync(descriptorPath, 'utf8'))

  const args = [
    'build',
    '--trust-builder',
    `${image}:${tag}`,
    '--descriptor',
    descriptorPath,
    '--buildpack',
    buildpack,
    '--tag',
    `${image}:latest`,
    '--creation-time',
    'now',
    '--clear-cache',
    '--verbose',
  ]

  if (publish) {
    args.push('--publish')
  }

  if (platform) {
    args.push('--platform', platform)
  }

  console.debug(`Packing with args:`, args)

  await installPack({ cwd, context })

  await execUtils.pipevp('pack', ['config', 'experimental', 'true'], {
    cwd: cwd ?? context.cwd,
    env: process.env,
    stdin: context.stdin,
    stdout: context.stdout,
    stderr: context.stderr,
    end: execUtils.EndStrategy.ErrorCode,
  })

  await execUtils.pipevp('pack', args, {
    cwd: cwd ?? context.cwd,
    env: process.env,
    stdin: context.stdin,
    stdout: context.stdout,
    stderr: context.stderr,
    end: execUtils.EndStrategy.ErrorCode,
  })

  return {
    images: [`${image}:${tag}`, `${image}:latest`],
    tags: [tag, 'latest'],
    workspace,
  }
}
