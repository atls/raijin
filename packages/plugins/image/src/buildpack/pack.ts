import type { CommandExecutor }    from './interfaces/executor.js'
import type { PackOptions }        from './interfaces/pack.js'
import type { PackOutputs }        from './interfaces/pack.js'

import { parse }                   from '@iarna/toml'
import { npath }                   from '@yarnpkg/fslib'
import { xfs }                     from '@yarnpkg/fslib'
import { ppath }                   from '@yarnpkg/fslib'

import { execOrThrow }             from './pack-cli.js'
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
    additionalTags = [],
    tagSuffixes = [],
    cwd,
  }: PackOptions,
  commandExecutor: CommandExecutor
): Promise<PackOutputs> => {
  const repo = workspace.replace('@', '').replace(/\//g, '-')
  const image = `${registry}${repo}`
  const aliases = normalizeAdditionalTags(additionalTags)
  const suffixes = normalizeAdditionalTags(tagSuffixes)

  if (tagPolicy === 'explicit' && (aliases.length === 0 || suffixes.length > 0)) {
    throw new Error('Explicit tag policy requires --tags and does not accept --tag-suffixes')
  }

  const imageTags =
    tagPolicy === 'explicit'
      ? [...new Set(aliases)].map((tag) => `${image}:${tag}`)
      : getPackImageTags(image, await getTag(tagPolicy, commandExecutor), aliases, suffixes)
  const [primaryImageTag, ...extraImageTags] = imageTags

  return xfs.mktempPromise(async (reportDir) => {
    const reportPath = ppath.join(reportDir, 'report.toml')
    const descriptorPath = ppath.join(cwd, 'project.toml')
    const args = [
      'build',
      primaryImageTag,
      '--builder',
      builder,
      '--buildpack',
      buildpack,
      '--path',
      npath.fromPortablePath(cwd),
      '--env',
      `WORKSPACE=${workspace}`,
      '--report-output-dir',
      npath.fromPortablePath(reportPath),
      '--trust-builder',
    ]

    if (await xfs.existsPromise(descriptorPath)) {
      args.push('--descriptor', npath.fromPortablePath(descriptorPath))
    }

    for (const imageTag of extraImageTags) {
      args.push('--tag', imageTag)
    }

    if (require && require.length > 0) {
      args.push('--env', `BP_REQUIRE=${require.join(',')}`)
    }

    if (publish) {
      args.push('--publish')
    }

    if (platform) {
      args.push('--platform', platform)
    }

    await execOrThrow(commandExecutor, 'pack', args)

    const report = parse(await xfs.readFilePromise(reportPath, 'utf8'))
    const imageReport = report.image

    if (!imageReport || typeof imageReport !== 'object' || Array.isArray(imageReport)) {
      throw new Error('pack report is missing the image result')
    }

    const fields = imageReport as Record<string, unknown>
    const { tags } = fields

    if (
      !Array.isArray(tags) ||
      tags.length === 0 ||
      tags.some((tag) => typeof tag !== 'string' || tag.length === 0)
    ) {
      throw new Error('pack report is missing image tags')
    }

    if (publish) {
      if (typeof fields.digest !== 'string' || fields.digest.length === 0) {
        throw new Error('pack report is missing the published image digest')
      }

      return { workspace, tags, published: true, digest: fields.digest }
    }

    if (typeof fields['image-id'] !== 'string' || fields['image-id'].length === 0) {
      throw new Error('pack report is missing the local image ID')
    }

    return { workspace, tags, published: false, imageId: fields['image-id'] }
  })
}
