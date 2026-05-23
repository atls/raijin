import { pathToFileURL }             from 'node:url'

import { StreamReport }              from '@yarnpkg/core'
import { Configuration }             from '@yarnpkg/core'
import { Project }                   from '@yarnpkg/core'
import { Filename }                  from '@yarnpkg/fslib'
import { execUtils }                 from '@yarnpkg/core'
import { scriptUtils }               from '@yarnpkg/core'
import { xfs }                       from '@yarnpkg/fslib'
import { ppath }                     from '@yarnpkg/fslib'
import { npath }                     from '@yarnpkg/fslib'

import { Tester }                    from '@atls/code-test'
import { TEST_EXEC_ARGV_ENV }        from '@atls/code-test'
import { createTestExecArgv }        from '@atls/code-test'

import { AbstractChecksTestCommand } from './abstract-checks-test.command.js'
import { GitHubChecks }              from './github.checks.js'

export class ChecksTestUnitCommand extends AbstractChecksTestCommand {
  static override paths = [['checks', 'test', 'unit']]

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

    const env = await scriptUtils.makeScriptEnv({ binFolder, project, ignoreCorepack: true })

    const pnpEsmLoaderPath = ppath.join(project.cwd, Filename.pnpEsmLoader)
    const pnpEsmLoader = (await xfs.existsPromise(pnpEsmLoaderPath))
      ? pathToFileURL(npath.fromPortablePath(pnpEsmLoaderPath)).href
      : undefined

    env[TEST_EXEC_ARGV_ENV] = JSON.stringify(createTestExecArgv(pnpEsmLoader))

    env.COMMAND_PROXY_EXECUTION = 'true'

    const { code } = await execUtils.pipevp('yarn', ['checks', 'test', 'unit'], {
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env,
    })

    return code
  }

  async executeRegular(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async () => {
        const checks = new GitHubChecks('Test:Unit')

        const { id: checkId } = await checks.start()

        try {
          const tester = await Tester.initialize(this.context.cwd)

          const results = await tester.unit(project.cwd)

          const annotations = this.formatResults(
            results.filter((result) => result.type === 'test:fail').map((result) => result.data),
            project.cwd,
            results
          )

          await checks.complete(checkId, {
            title: annotations.length > 0 ? `Errors ${annotations.length}` : 'Successful',
            summary:
              annotations.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
            annotations,
          })
        } catch (error) {
          await checks.failure({
            title: 'Test:Unit run failed',
            summary: error instanceof Error ? error.message : (error as string),
          })
        }
      }
    )

    return commandReport.exitCode()
  }
}
