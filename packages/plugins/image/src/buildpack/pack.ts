import type { CommandExecutor }    from './executor.interfaces.js'
import type { PackOptions }        from './pack.interfaces.js'
import type { PackOutputs }        from './pack.interfaces.js'

import { readFileSync }            from 'node:fs'

import { stringify }               from '@iarna/toml'
import { xfs }                     from '@yarnpkg/fslib'
import { ppath }                   from '@yarnpkg/fslib'

import { createProjectDescriptor } from './descriptor.js'
import { execOrThrow }             from './pack-cli.js'
import { installPack }             from './pack-cli.js'
import { getPackImageTags }        from './tags.js'
import { normalizeAdditionalTags } from './tags.js'
import { getTag }                  from './tags.js'

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
    additionalTags,
    cwd,
  }: PackOptions,
  commandExecutor: CommandExecutor
): Promise<PackOutputs> => {
  const packCwd = cwd ?? commandExecutor.cwd
  const repo = workspace.replace('@', '').replace(/\//g, '-')
  const image = `${registry}${repo}`

  const tag = await getTag(tagPolicy, commandExecutor)

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

  const imageTags = getPackImageTags(image, tag, additionalTags)
  const [primaryImageTag, ...extraImageTags] = imageTags

  // eslint-disable-next-line no-console, n/no-sync
  console.debug('project.toml', readFileSync(descriptorPath, 'utf8'))

  const args = [
    'build',
    '--trust-builder',
    primaryImageTag,
    '--descriptor',
    descriptorPath,
    '--path',
    packCwd,
    '--buildpack',
    buildpack,
    '--creation-time',
    'now',
    '--clear-cache',
    '--verbose',
  ]

  for (const imageTag of extraImageTags) {
    args.push('--tag', imageTag)
  }

  if (publish) {
    args.push('--publish')
  }

  if (platform) {
    args.push('--platform', platform)
  }

  // eslint-disable-next-line no-console
  console.debug(`Packing with args:`, args)

  await installPack({ commandExecutor, cwd: packCwd })

  await execOrThrow(commandExecutor, 'pack', ['config', 'experimental', 'true'])

  await execOrThrow(commandExecutor, 'pack', args)

  return {
    images: imageTags,
    tags: [tag, 'latest', ...normalizeAdditionalTags(additionalTags)],
    workspace,
  }
}
