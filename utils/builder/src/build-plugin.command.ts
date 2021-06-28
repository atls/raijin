/* Patched version @yarnpkg/builder */

import { isDynamicLib }  from '@yarnpkg/builder/lib/tools/isDynamicLib'
import { makeConfig }    from '@yarnpkg/builder/lib/tools/makeConfig'
import { WebpackPlugin } from '@yarnpkg/builder/lib/tools/makeConfig'
import { StreamReport }  from '@yarnpkg/core'
import { MessageName }   from '@yarnpkg/core'
import { Configuration } from '@yarnpkg/core'
import { formatUtils }   from '@yarnpkg/core'
import { structUtils }   from '@yarnpkg/core'
import { npath }         from '@yarnpkg/fslib'
import { Command }       from 'clipanion'
import { Option }        from 'clipanion'
import { Usage }         from 'clipanion'
import fs                from 'fs'
import path              from 'path'
import TerserPlugin      from 'terser-webpack-plugin'
import webpack           from 'webpack'

const getNormalizedName = (name: string) => name.replace('yarn-plugin', 'plugin')

export class BuildPluginCommand extends Command {
  static paths = [['build', 'plugin']]

  noMinify = Option.Boolean(`--no-minify`, false, {
    description: `Build a plugin for development, without optimizations (minifying, mangling, treeshaking)`,
  })

  static usage: Usage = Command.Usage({
    description: `build a local plugin`,
    details: `
        This command builds a local plugin.
      `,
    examples: [
      [`Build a local plugin`, `$0 build plugin`],
      [`Build a local development plugin`, `$0 build plugin --no-minify`],
    ],
  })

  async execute() {
    const basedir = process.cwd()
    const portableBaseDir = npath.toPortablePath(basedir)
    const configuration = Configuration.create(portableBaseDir)

    // eslint-disable-next-line
    const { name: rawName } = require(`${basedir}/package.json`)
    const name = getNormalizedName(rawName)
    const prettyName = structUtils.prettyIdent(configuration, structUtils.parseIdent(name))
    const output = `${basedir}/dist/${name}.js`

    let buildErrors: string | null = null

    const report = await StreamReport.start(
      {
        configuration,
        includeFooter: false,
        stdout: this.context.stdout,
        forgettableNames: new Set([MessageName.UNNAMED]),
      },
      // eslint-disable-next-line
      async (report) => {
        await report.startTimerPromise(`Building ${prettyName}`, async () => {
          const progress = StreamReport.progressViaCounter(1)
          report.reportProgress(progress)

          const prettyWebpack = structUtils.prettyIdent(
            configuration,
            structUtils.makeIdent(null, `webpack`)
          )

          const compiler = webpack(
            makeConfig({
              context: basedir,
              entry: `.`,

              ...(!this.noMinify && {
                mode: `production`,
              }),

              ...(!this.noMinify && {
                optimization: {
                  minimizer: [
                    new TerserPlugin({
                      cache: false,
                      extractComments: false,
                      terserOptions: {
                        ecma: 8,
                      },
                    }) as WebpackPlugin,
                  ],
                },
              }),

              output: {
                filename: path.basename(output),
                path: path.dirname(output),
                libraryTarget: `var`,
                library: `plugin`,
              },

              externals: [
                ({ context, request }, callback: any) => {
                  // @ts-ignore
                  if (request !== name && isDynamicLib(request)) {
                    callback(null, `commonjs ${request}`)
                  } else {
                    callback()
                  }
                },
              ],

              plugins: [
                // This plugin wraps the generated bundle so that it doesn't actually
                // get evaluated right now - until after we give it a custom require
                // function that will be able to fetch the dynamic modules.
                {
                  // eslint-disable-next-line
                  apply: (compiler: webpack.Compiler) => {
                    compiler.hooks.compilation.tap(
                      `MyPlugin`,
                      (compilation: webpack.Compilation) => {
                        compilation.hooks.optimizeChunkAssets.tap(
                          `MyPlugin`,
                          (chunks: Set<webpack.Chunk>) => {
                            // eslint-disable-next-line
                            for (const chunk of chunks) {
                              // eslint-disable-next-line
                              for (const file of chunk.files) {
                                // eslint-disable-next-line
                                compilation.assets[file] = new webpack.sources.RawSource(
                                  [
                                    `/* eslint-disable */`,
                                    `module.exports = {`,
                                    `name: ${JSON.stringify(name)},`,
                                    `factory: function (require) {`,
                                    compilation.assets[file].source(),
                                    `return plugin;`,
                                    `}`,
                                    `};`,
                                  ].join(`\n`)
                                )
                              }
                            }
                          }
                        )
                      }
                    )
                  },
                },
                new webpack.ProgressPlugin((percentage: number, message: string) => {
                  progress.set(percentage)

                  if (message) {
                    report.reportInfoOnce(MessageName.UNNAMED, `${prettyWebpack}: ${message}`)
                  }
                }),
              ],
            })
          )

          buildErrors = await new Promise<string | null>((resolve, reject) => {
            compiler.run((err, stats) => {
              if (err) {
                reject(err)
              } else if (stats && stats.compilation.errors.length > 0) {
                resolve(stats.toString(`errors-only`))
              } else {
                resolve(null)
              }
            })
          })
        })
      }
    )

    report.reportSeparator()

    const Mark = formatUtils.mark(configuration)

    if (buildErrors !== null) {
      report.reportError(MessageName.EXCEPTION, `${Mark.Cross} Failed to build ${prettyName}:`)
      report.reportError(MessageName.EXCEPTION, `${buildErrors}`)
    } else {
      report.reportInfo(null, `${Mark.Check} Done building ${prettyName}!`)
      report.reportInfo(
        null,
        `${Mark.Question} Bundle path: ${formatUtils.pretty(
          configuration,
          // @ts-ignore
          output,
          formatUtils.Type.PATH
        )}`
      )
      report.reportInfo(
        null,
        `${Mark.Question} Bundle size: ${formatUtils.pretty(
          configuration,
          // @ts-ignore
          fs.statSync(output).size,
          formatUtils.Type.SIZE
        )}`
      )
    }

    return report.exitCode()
  }
}
