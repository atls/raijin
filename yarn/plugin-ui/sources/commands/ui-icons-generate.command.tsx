import { join }          from 'node:path'
import { relative }      from 'node:path'

import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { Filename }      from '@yarnpkg/fslib'
import { execUtils }     from '@yarnpkg/core'
import { scriptUtils }   from '@yarnpkg/core'
import { xfs }           from '@yarnpkg/fslib'
import { Option }        from 'clipanion'
import { globby }        from 'globby'
import { render }        from 'ink'

import { ErrorInfo }     from '@atls/cli-ui-error-info-component'
import { IconsProgress } from '@atls/cli-ui-icons-progress-component'
import { Icons }         from '@atls/code-icons'
import { renderStatic }  from '@atls/cli-ui-renderer-static-component'

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
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const binFolder = await xfs.mktempPromise()

    const args: Array<string> = []

    if (this.native) {
      args.push('--native')
    }

    const { code } = await execUtils.pipevp('yarn', ['ui', 'icons', 'generate', ...args], {
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env: {
        ...(await scriptUtils.makeScriptEnv({ binFolder, project })),
        COMMAND_PROXY_EXECUTION: 'true',
      },
    })

    return code
  }

  async executeRegular(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const icons = await Icons.initialize(this.context.cwd)

    const { clear } = render(<IconsProgress icons={icons} />)

    try {
      await icons.generate({ native: this.native })

      const files = (
        await globby('*.tsx', {
          cwd: join(this.context.cwd, 'src'),
        })
      ).map((file) => join(relative(project.cwd, this.context.cwd), 'src', file))

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
