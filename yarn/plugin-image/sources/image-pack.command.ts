import type { TagPolicy }    from '@atls/code-pack'
import type { Workspace }    from '@yarnpkg/core'
import type { PortablePath } from '@yarnpkg/fslib'

import { readFileSync }      from 'node:fs'

import { BaseCommand }       from '@yarnpkg/cli'
import { Configuration }     from '@yarnpkg/core'
import { Project }           from '@yarnpkg/core'
import { StreamReport }      from '@yarnpkg/core'
import { stringify }         from '@iarna/toml'
import { structUtils }       from '@yarnpkg/core'
import { execUtils }         from '@yarnpkg/core'
import { xfs }               from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'
import { Option }            from 'clipanion'
import { join }              from 'path'

import { tagUtils }          from '@atls/code-pack'
import { packUtils }         from '@atls/yarn-pack-utils'

const forRepository = async (repo: string): Promise<PortablePath> => {
  const descriptor = {
    project: {
      id: repo,
      name: repo,
      version: '0.0.1',
    },
    build: {
      exclude: ['.git', '.yarn/unplugged'],
    },
  }

  const descriptorPath = ppath.join(await xfs.mktempPromise(), 'project.toml')

  await xfs.writeFilePromise(descriptorPath, stringify(descriptor))

  return descriptorPath
}

class ImagePackCommand extends BaseCommand {
  static paths = [['image', 'pack']]

  registry: string = Option.String('-r,--registry', { required: true })

  tagPolicy?: TagPolicy = Option.String('-t,--tag-policy')

  publish: boolean = Option.Boolean('-p,--publish', false)

  async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const { project } = await Project.find(configuration, this.context.cwd)

    const workspace: Workspace = project.getWorkspaceByFilePath(this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        configuration,
        stdout: this.context.stdout,
      },
      async (report) => {
        if (this.isWorkspaceAllowedForBundle(workspace)) {
          const destination = await xfs.mktempPromise()

          report.reportInfo(
            null,
            `Package workspace ${
              workspace.manifest.name
                ? structUtils.prettyIdent(configuration, workspace.manifest.name)
                : workspace.relativeCwd
            } to ${destination}`
          )

          await packUtils.pack(configuration, project, workspace, report, destination)

          const repo = workspace.manifest.raw.name.replace('@', '').replace(/\//g, '-')
          const image = `${this.registry}${repo}`
          const content = readFileSync(join(this.context.cwd, 'package.json'), 'utf-8')

          const { packConfiguration = {} } = JSON.parse(content)

          const tag = await tagUtils.getTag(this.tagPolicy || 'revision')

          const descriptorPath = await forRepository(repo)

          const buildpackVersion = packConfiguration.buildpackVersion || '0.0.5'
          const builderTag = packConfiguration.builderTag || 'buster-18.19'

          const args = [
            'build',
            '--trust-builder',
            `${image}:${tag}`,
            '--verbose',
            '--buildpack',
            `atlantislab/buildpack-yarn-workspace:${buildpackVersion}`,
            '--builder',
            `atlantislab/builder-base:${builderTag}`,
            '--descriptor',
            descriptorPath,
            '--tag',
            `${image}:latest`,
          ]

          if (this.publish) {
            args.push('--publish')
          }

          await execUtils.pipevp('pack', args, {
            cwd: destination,
            env: process.env,
            stdin: this.context.stdin,
            stdout: this.context.stdout,
            stderr: this.context.stderr,
            end: execUtils.EndStrategy.ErrorCode,
          })
        } else {
          report.reportInfo(
            null,
            `Workspace ${
              workspace.manifest.name
                ? structUtils.prettyIdent(configuration, workspace.manifest.name)
                : workspace.relativeCwd
            } not allowed for package.`
          )
        }
      }
    )

    return commandReport.exitCode()
  }

  isWorkspaceAllowedForBundle(workspace: Workspace): boolean {
    const { scripts, name } = workspace.manifest

    const buildCommand = scripts.get('build')

    const hasAllowedBuildScript = [
      'actl service build',
      'actl renderer build',
      'build-storybook',
      'storybook build',
      'next build',
      'builder build library',
      'app service build',
      'app renderer build',
      'service build',
      'renderer build',
      'strapi build',
    ].some((command) => buildCommand?.includes(command))

    return hasAllowedBuildScript && Boolean(name)
  }
}

export { ImagePackCommand }
