import { spawn }           from 'node:child_process'
import { resolve }         from 'node:path'

import { BaseCommand }     from '@yarnpkg/cli'
import { Configuration }   from '@yarnpkg/core'
import { Project }         from '@yarnpkg/core'
import { StreamReport }    from '@yarnpkg/core'
import { MessageName }     from '@yarnpkg/core'
import { Filename }        from '@yarnpkg/fslib'
import { execUtils }       from '@yarnpkg/core'
import { scriptUtils }     from '@yarnpkg/core'
import { xfs }             from '@yarnpkg/fslib'
import { npath }           from '@yarnpkg/fslib'
import { ppath }           from '@yarnpkg/fslib'
import { Option }          from 'clipanion'

import { getChangedFiles } from '@atls/yarn-plugin-files'

import { GitHubChecks }    from './github.checks.js'

const TYPECHECK_TIMEOUT_MS = 5 * 60 * 1000

class ChecksTypeCheckCommand extends BaseCommand {
  static override paths = [['checks', 'typecheck']]

  changed = Option.Boolean('--changed', false)

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
    const args = ['checks', 'typecheck', ...(this.changed ? ['--changed'] : [])]

    const { code } = await execUtils.pipevp('yarn', args, {
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env: {
        ...(await scriptUtils.makeScriptEnv({ binFolder, project, ignoreCorepack: true })),
        COMMAND_PROXY_EXECUTION: 'true',
      },
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
      async (report) => {
        const checks = new GitHubChecks('TypeCheck')

        try {
          const { id: checkId } = await checks.start()

          await report.startTimerPromise('TypeCheck', async () => {
            try {
              const includes = await this.getIncludes(project)

              if (this.changed && includes.length === 0) {
                report.reportInfo(MessageName.UNNAMED, 'No TypeScript files changed')

                await checks.complete(checkId, {
                  title: 'Successful',
                  summary: 'No TypeScript files changed',
                  annotations: [],
                })

                return
              }

              report.reportInfo(MessageName.UNNAMED, `TypeCheck targets: ${includes.length}`)

              const code = await this.runTypecheck(project, includes)

              if (code === 0) {
                await checks.complete(checkId, {
                  title: 'Successful',
                  summary: 'All checks passed',
                  annotations: [],
                })
              } else {
                await checks.failure(
                  {
                    title: 'TypeCheck run failed',
                    summary:
                      code === 124
                        ? `TypeCheck timed out after ${TYPECHECK_TIMEOUT_MS / 1000}s`
                        : `TypeCheck failed with exit code ${code}`,
                  },
                  checkId
                )

                report.reportError(
                  MessageName.UNNAMED,
                  code === 124
                    ? `TypeCheck timed out after ${TYPECHECK_TIMEOUT_MS / 1000}s`
                    : `TypeCheck failed with exit code ${code}`
                )
              }
            } catch (error) {
              await checks.failure(
                {
                  title: 'TypeCheck run failed',
                  summary: error instanceof Error ? error.message : (error as string),
                },
                checkId
              )
            }
          })
        } catch (error) {
          await checks.failure({
            title: 'TypeCheck start failed',
            summary: error instanceof Error ? error.message : (error as string),
          })
        }
      }
    )

    return commandReport.exitCode()
  }

  protected async getIncludes(project: Project): Promise<Array<string>> {
    if (this.changed) {
      const includes = (await getChangedFiles(project)).filter((file) =>
        /\.(cts|mts|ts|tsx)$/.test(file))

      const existsMap = await Promise.all(
        includes.map(async (file) =>
          xfs.existsPromise(npath.toPortablePath(resolve(project.cwd, file))))
      )

      return includes.filter((_, index) => existsMap[index])
    }

    if (await xfs.existsPromise(ppath.join(project.cwd, 'tsconfig.json'))) {
      const tsconfig: { include?: Array<string> } = await xfs.readJsonPromise(
        ppath.join(project.cwd, 'tsconfig.json')
      )

      if (tsconfig.include && tsconfig.include.length > 0) {
        return tsconfig.include
      }
    }

    return project.topLevelWorkspace.manifest.workspaceDefinitions.map(
      (definition) => definition.pattern
    )
  }

  private async runTypecheck(project: Project, includes: Array<string>): Promise<number> {
    const binFolder = await xfs.mktempPromise()
    const env = {
      ...(await scriptUtils.makeScriptEnv({ binFolder, project, ignoreCorepack: true })),
      COMMAND_PROXY_EXECUTION: 'true',
    }
    let timeout: NodeJS.Timeout | undefined

    return new Promise((resolvePromise, rejectPromise) => {
      let timedOut = false
      const child = spawn('yarn', ['typecheck', ...includes], {
        cwd: npath.fromPortablePath(project.cwd),
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      child.stdout.pipe(this.context.stdout, { end: false })
      child.stderr.pipe(this.context.stderr, { end: false })

      timeout = setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')

        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL')
          }
        }, 5000).unref()
      }, TYPECHECK_TIMEOUT_MS)

      child.on('error', rejectPromise)
      child.on('close', (code) => {
        if (timeout) {
          clearTimeout(timeout)
        }

        resolvePromise(timedOut ? 124 : (code ?? 1))
      })
    })
  }
}

export { ChecksTypeCheckCommand }
