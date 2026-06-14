import type { execUtils }          from '@yarnpkg/core'

import type { PackOptions }        from './pack.interfaces.js'
import type { PackOutputs }        from './pack.interfaces.js'

import { readFileSync }            from 'node:fs'

import { stringify }               from '@iarna/toml'
import { xfs }                     from '@yarnpkg/fslib'
import { ppath }                   from '@yarnpkg/fslib'

import { createProjectDescriptor } from './pack-descriptor.utils.js'
import { execOrThrow }             from './pack.utils.js'
import { installPack }             from './pack.utils.js'
import { getTag }                  from './tag.utils.js'

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
  const packCwd = cwd ?? context.cwd
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

  const descriptor = await createProjectDescriptor({
    repo,
    builder,
    envs,
    cwd: packCwd,
    platform,
  })

  const descriptorPath = ppath.join(await xfs.mktempPromise(), 'project.toml')

  await xfs.writeFilePromise(descriptorPath, stringify(descriptor))

  // eslint-disable-next-line no-console, n/no-sync
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

  // eslint-disable-next-line no-console
  console.debug(`Packing with args:`, args)

  await installPack({ cwd, context })

  await execOrThrow('pack', ['config', 'experimental', 'true'], {
    cwd: packCwd,
    env: process.env,
    stdin: context.stdin,
    stdout: context.stdout,
    stderr: context.stderr,
  })

  await execOrThrow('pack', args, {
    cwd: packCwd,
    env: process.env,
    stdin: context.stdin,
    stdout: context.stdout,
    stderr: context.stderr,
  })

  return {
    images: [`${image}:${tag}`, `${image}:latest`],
    tags: [tag, 'latest'],
    workspace,
  }
}
