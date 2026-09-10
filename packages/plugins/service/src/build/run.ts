import type { webpack as wp }   from '@atls/raijin/webpack'

import type { BuildDiagnostic } from './interfaces.js'

import { SeverityNumber }       from '@atls/logger'

import { WebpackConfig }        from './configuration.js'
import { stageArtifact }        from './artifact.js'
import { loadWebpackRuntime }   from './runtime.js'

export interface BuildProjectInput {
  cwd: string
  onProgress?: (progress: { message: string; percent: number }) => void
  workspacePackageNames?: Iterable<string>
}

export type BuildProjectResult =
  | { diagnostics: Array<BuildDiagnostic>; entry: string; status: 'built' }
  | { diagnostics: Array<BuildDiagnostic>; status: 'build-failed' }
  | { error: unknown; status: 'provider-failed' }

const closeCompiler = async (compiler: wp.Compiler): Promise<void> =>
  new Promise((resolve, reject) => {
    compiler.close((error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })

const runCompiler = async (compiler: wp.Compiler): Promise<{ error?: Error; stats?: wp.Stats }> =>
  new Promise((resolve) => {
    compiler.run((error, stats) => {
      resolve({ error: error ?? undefined, stats })
    })
  })

const collectDiagnostics = (stats: wp.Stats): Array<BuildDiagnostic> => {
  const { errors = [], warnings = [] } = stats.toJson({ all: false, errors: true, warnings: true })

  return [
    ...errors.map((record): BuildDiagnostic => ({ record, severityNumber: SeverityNumber.ERROR })),
    ...warnings.map((record): BuildDiagnostic => ({ record, severityNumber: SeverityNumber.WARN })),
  ]
}

export const buildProject = async ({
  cwd,
  onProgress,
  workspacePackageNames = [],
}: BuildProjectInput): Promise<BuildProjectResult> => {
  let artifact: Awaited<ReturnType<typeof stageArtifact>> | undefined
  let compilation: Awaited<ReturnType<WebpackConfig['build']>> | undefined
  let compiler: wp.Compiler | undefined
  let result: BuildProjectResult

  try {
    artifact = await stageArtifact(cwd)
    const { nodeLoaderPath, protoLoaderPath, tsLoaderPath, webpack } = await loadWebpackRuntime(cwd)
    compilation = await new WebpackConfig(
      webpack,
      { nodeLoader: nodeLoaderPath, protoLoader: protoLoaderPath, tsLoader: tsLoaderPath },
      cwd,
      artifact.path,
      workspacePackageNames
    ).build(
      'production',
      onProgress
        ? [
            new webpack.ProgressPlugin((percent: number, message: string) => {
              onProgress({ message, percent: percent * 100 })
            }),
          ]
        : []
    )
    compiler = webpack(compilation.configuration)

    const execution = await runCompiler(compiler)

    if (execution.error) {
      result = { error: execution.error, status: 'provider-failed' }
    } else if (!execution.stats) {
      result = {
        error: new Error('Webpack completed without compilation statistics'),
        status: 'provider-failed',
      }
    } else {
      const diagnostics = collectDiagnostics(execution.stats)

      result = execution.stats.hasErrors()
        ? { diagnostics, status: 'build-failed' }
        : { diagnostics, entry: await artifact.commit(), status: 'built' }
    }
  } catch (error) {
    result = { error, status: 'provider-failed' }
  }

  try {
    if (compiler) {
      await closeCompiler(compiler)
    }

    await compilation?.dispose()
    await artifact?.dispose()
  } catch (error) {
    return { error, status: 'provider-failed' }
  }

  return result
}
