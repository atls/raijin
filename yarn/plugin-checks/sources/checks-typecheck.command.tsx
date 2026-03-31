import type { PortablePath }            from '@yarnpkg/fslib'
import type { ts }                      from '@atls/code-runtime/typescript'

import type { Annotation }              from './github.checks.js'

import { EOL }                          from 'node:os'
import { resolve }                      from 'node:path'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Configuration }                from '@yarnpkg/core'
import { Project }                      from '@yarnpkg/core'
import { StreamReport }                 from '@yarnpkg/core'
import { MessageName }                  from '@yarnpkg/core'
import { Filename }                     from '@yarnpkg/fslib'
import { codeFrameColumns }             from '@babel/code-frame'
import { execUtils }                    from '@yarnpkg/core'
import { scriptUtils }                  from '@yarnpkg/core'
import { xfs }                          from '@yarnpkg/fslib'
import { npath }                        from '@yarnpkg/fslib'
import { ppath }                        from '@yarnpkg/fslib'
import { Option }                       from 'clipanion'
import { flattenDiagnosticMessageText } from 'typescript'
import React                            from 'react'

import { TypeScriptDiagnostic }         from '@atls/cli-ui-typescript-diagnostic-component'
import { TypeScript }                   from '@atls/code-typescript'
import { renderStatic }                 from '@atls/cli-ui-renderer-static-component'
import { getChangedFiles }              from '@atls/yarn-plugin-files'

import { GitHubChecks }                 from './github.checks.js'
import { AnnotationLevel }              from './github.checks.js'

class ChecksTypeCheckCommand extends BaseCommand {
  static paths = [['checks', 'typecheck']]

  changed = Option.Boolean('--changed', false)

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

    const { code } = await execUtils.pipevp('yarn', ['checks', 'typecheck'], {
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env: await scriptUtils.makeScriptEnv({ binFolder, project }),
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

        const { id: checkId } = await checks.start()

        await report.startTimerPromise('TypeCheck', async () => {
          try {
            const typescript = await TypeScript.initialize(project.cwd)
            const includes = await this.getIncludes(project)

            const diagnostics =
              this.changed && includes.length === 0 ? [] : await typescript.check(includes)

            diagnostics.forEach((diagnostic: ts.Diagnostic) => {
              const output = renderStatic(<TypeScriptDiagnostic {...diagnostic} />)

              output.split('\n').forEach((line) => {
                report.reportInfo(MessageName.UNNAMED, line)
              })
            })

            const annotations: Array<Annotation> = []

            diagnostics.forEach((diagnostic: ts.Diagnostic) => {
              if (diagnostic.file) {
                const position = diagnostic.start
                  ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
                  : null

                annotations.push({
                  path: ppath.normalize(
                    ppath.relative(project.cwd, diagnostic.file.fileName as PortablePath)
                  ),
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  title: flattenDiagnosticMessageText(diagnostic.messageText, EOL)
                    .split(EOL)
                    .at(0)!,
                  message: flattenDiagnosticMessageText(diagnostic.messageText, EOL),
                  start_line: position ? position.line + 1 : 0,
                  end_line: position ? position.line + 1 : 0,
                  raw_details: position
                    ? codeFrameColumns(
                        // eslint-disable-next-line n/no-sync
                        xfs.readFileSync(diagnostic.file.fileName as PortablePath).toString(),
                        {
                          start: {
                            line: position.line + 1,
                            column: position.character + 1,
                          },
                        },
                        { highlightCode: false }
                      )
                    : flattenDiagnosticMessageText(diagnostic.messageText, EOL),
                  annotation_level: AnnotationLevel.Failure,
                })
              }
            })

            await checks.complete(checkId, {
              title: diagnostics.length > 0 ? `Errors ${annotations.length}` : 'Successful',
              summary:
                diagnostics.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
              annotations,
            })
          } catch (error) {
            await checks.failure({
              title: 'TypeCheck run failed',
              summary: error instanceof Error ? error.message : (error as string),
            })
          }
        })
      }
    )

    return commandReport.exitCode()
  }

  protected async getIncludes(project: Project): Promise<Array<string>> {
    if (this.changed) {
      const includes = (await getChangedFiles(project))
        .filter((file) => /\.(cts|mts|ts|tsx)$/.test(file))
        .filter((file) => !file.endsWith('.d.ts'))

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
}

export { ChecksTypeCheckCommand }
