import type { PackOptions } from './pack.interfaces.js'
import type { PackOutputs } from './pack.interfaces.js'

import { stringify }        from '@iarna/toml'
import { execUtils }        from '@yarnpkg/core'
import { xfs }              from '@yarnpkg/fslib'
import { ppath }            from '@yarnpkg/fslib'

import { getTag }           from './tag.utils.js'

export const pack = async (
  { workspace, registry, publish, tagPolicy, builder, buildpack }: PackOptions,
  context: execUtils.PipevpOptions
): Promise<PackOutputs> => {
  const repo = workspace.replace('@', '').replace(/\//g, '-')
  const image = `${registry}${repo}`

  const tag = await getTag(tagPolicy)

  const descriptor = {
    project: {
      id: repo,
      name: repo,
      version: '0.0.1',
    },
    build: {
      exclude: ['.git', '.yarn/unplugged'],
      env: [
        {
          name: 'WORKSPACE',
          value: workspace,
        },
      ],
    },
  }

  const descriptorPath = ppath.join(await xfs.mktempPromise(), 'project.toml')

  await xfs.writeFilePromise(descriptorPath, stringify(descriptor))

  const args = [
    'build',
    '--trust-builder',
    `${image}:${tag}`,
    '--descriptor',
    descriptorPath,
    '--buildpack',
    buildpack || 'atlantislab/buildpack-yarn-workspace:0.0.5',
    '--builder',
    builder || 'atlantislab/builder-base:buster',
    '--tag',
    `${image}:latest`,
    '--verbose',
  ]

  if (publish) {
    args.push('--publish')
  }

  // TODO: check and install pack

  await execUtils.pipevp('pack', args, context)

  return {
    images: [`${image}:${tag}`, `${image}:latest`],
    tags: [tag, 'latest'],
    workspace,
  }
}
