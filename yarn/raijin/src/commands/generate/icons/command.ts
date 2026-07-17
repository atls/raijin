import type { CommandInput }          from '@atls/raijin/commands/input'
import type { PortablePath }          from '@yarnpkg/fslib'

import { BaseCommand }                from '@yarnpkg/cli'
import { Option }                     from 'clipanion'

import { createCommandInput }         from '@atls/raijin/commands/input'
import { toCommandArguments }         from '@atls/raijin/commands/input'
import { proxyWorkspaceCommand }      from '@atls/raijin/commands/invocation'
import { resolveWorkspaceInvocation } from '@atls/raijin/commands/invocation'
import { shouldProxyCommand }         from '@atls/raijin/commands/invocation'

import { Generator }                  from './generator.js'

export const createGeneratedIconInput = (
  workspaceCwd: PortablePath,
  files: Array<string>
): CommandInput =>
  createCommandInput({
    cwd: workspaceCwd,
    source: 'generated',
    targets: files.map((file) => `src/${file}`),
  })

export class GenerateIconsCommand extends BaseCommand {
  static override paths = [['ui', 'icons', 'generate']]

  native: boolean = Option.Boolean('-n,--native', false)

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  private async executeProxy(): Promise<number> {
    const args: Array<string> = []

    if (this.native) {
      args.push('--native')
    }

    return proxyWorkspaceCommand({
      args: ['ui', 'icons', 'generate', ...args],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  private async executeRegular(): Promise<number> {
    const { executionCwd, project } = await resolveWorkspaceInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const generator = await Generator.initialize(executionCwd)

    const input = createGeneratedIconInput(
      executionCwd,
      await generator.generate({ native: this.native })
    )
    const generatedFiles = toCommandArguments(input, project.cwd)
    const formatExitCode = await this.cli.run(['format', ...generatedFiles], {
      cwd: project.cwd,
    })

    if (formatExitCode !== 0) {
      return formatExitCode
    }

    return this.cli.run(['lint', '--fix', ...generatedFiles], {
      cwd: project.cwd,
    })
  }
}
