import { join }                           from 'node:path'
import { relative }                       from 'node:path'

import { BaseCommand }                    from '@yarnpkg/cli'
import { Filename }                       from '@yarnpkg/fslib'
import { execUtils }                      from '@yarnpkg/core'
import { xfs }                            from '@yarnpkg/fslib'
import { Option }                         from 'clipanion'
import { globby }                         from 'globby'
import { render }                         from 'ink'
import React                              from 'react'

import { ErrorInfo }                      from '@atls/cli-ui-error-info-component'
import { IconsProgress }                  from '@atls/cli-ui-icons-progress-component'
import { Icons }                          from '@atls/code-icons'
import { renderStatic }                   from '@atls/cli-ui-renderer-static-component'
import { resolveWorkspaceCommandContext } from '@atls/yarn-plugin-tools/command-context'
import { makeCurrentYarnExecutable }      from '@atls/yarn-plugin-tools/current-yarn-executable'

export class UiIconsGenerateCommand extends BaseCommand {
  static override paths = [['ui', 'icons', 'generate']]

  native: boolean = Option.Boolean('-n, --native', false)

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    if (process.env.COMMAND_PROXY_EXECUTION === 'true') {
      return this.executeRegular()
    }

    return this.executeProxy()
  }

  async executeProxy(): Promise<number> {
    const { project, workspaceCwd } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )

    const binFolder = await xfs.mktempPromise()

    const args: Array<string> = []

    if (this.native) {
      args.push('--native')
    }

    const { executable, env } = await makeCurrentYarnExecutable({
      binFolder,
      project,
      env: {
        COMMAND_PROXY_EXECUTION: 'true',
      },
    })

    const { code } = await execUtils.pipevp(executable, ['ui', 'icons', 'generate', ...args], {
      cwd: workspaceCwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env,
    })

    return code
  }

  async executeRegular(): Promise<number> {
    const { project, workspaceCwd } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )

    const icons = await Icons.initialize(workspaceCwd)

    const { clear } = render(<IconsProgress icons={icons} />)

    try {
      await icons.generate({ native: this.native })

      const files = (
        await globby('*.tsx', {
          cwd: join(workspaceCwd, 'src'),
        })
      ).map((file) => join(relative(project.cwd, workspaceCwd), 'src', file))

      await this.cli.run(['format', ...files], {
        cwd: project.cwd,
      })
      await this.cli.run(['lint', '--fix', ...files], {
        cwd: project.cwd,
      })

      return 0
    } catch (error) {
      if (error instanceof Error) {
        renderStatic(<ErrorInfo error={error} />)
          .split('\n')
          .forEach((line) => {
            console.error(line) // eslint-disable-line no-console
          })
      } else {
        console.error(error) // eslint-disable-line no-console
      }

      return 1
    } finally {
      clear()
    }
  }
}
