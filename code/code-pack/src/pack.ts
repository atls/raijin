import { stringify }   from '@iarna/toml'
import { execUtils }   from '@yarnpkg/core'
import { xfs }         from '@yarnpkg/fslib'
import { ppath }       from '@yarnpkg/fslib'
import { toFilename }  from '@yarnpkg/fslib'

import { PackOptions } from './pack.interfaces'
import { PackOutputs } from './pack.interfaces'
import { getTag }      from './tag.utils'

export const pack = async (
  { workspace, registry, publish, tagPolicy, builder, buildpack }: PackOptions,
  context
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

  const descriptorPath = ppath.join(await xfs.mktempPromise(), toFilename('project.toml'))

  await xfs.writeFilePromise(descriptorPath, stringify(descriptor))

  const args = [
    'build',
    `${image}:${tag}`,
    '--descriptor',
    descriptorPath,
    '--buildpack',
    buildpack || 'atls/buildpack-yarn-workspace:0.0.2',
    '--builder',
    builder || 'monstrs/builder-base:buster',
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
