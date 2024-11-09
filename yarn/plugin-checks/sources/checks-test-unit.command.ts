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

import { AbstractChecksTestCommand } from './abstract-checks-test.command.js'
import { GitHubChecks }              from './github.checks.js'

class ChecksTestUnitCommand extends AbstractChecksTestCommand {
  static paths = [['checks', 'test', 'unit']]

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    return this.executeProxy()
  }

  async executeProxy(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const binFolder = await xfs.mktempPromise()

    const env = await scriptUtils.makeScriptEnv({ binFolder, project })

    if (!env.NODE_OPTIONS?.includes('@monstrs/tools-runtime/ts-node-register')) {
      env.NODE_OPTIONS = `${env.NODE_OPTIONS} --loader @monstrs/tools-runtime/ts-node-register`
      env.NODE_OPTIONS = `${env.NODE_OPTIONS} --loader ${pathToFileURL(npath.fromPortablePath(ppath.join(project.cwd, Filename.pnpEsmLoader))).href}`
      env.NODE_OPTIONS = `${env.NODE_OPTIONS} --loader @monstrs/tools-runtime/ts-ext-register`
    }

    if (!env.NODE_OPTIONS?.includes('--enable-source-maps')) {
      env.NODE_OPTIONS = `${env.NODE_OPTIONS} --enable-source-maps`
    }

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
          const tester = await Tester.initialize()

          const results = await tester.unit(project.cwd)

          const annotations = this.formatResults(
            results.filter((result) => result.type === 'test:fail').map((result) => result.data),
            project.cwd
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

export { ChecksTestUnitCommand }
