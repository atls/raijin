import type { ApplicationExecutionResult } from '@atls/raijin/commands'
import type { ApplicationInvocation }      from '@atls/raijin/commands'
import type { webpack as wp }              from '@atls/raijin/webpack'

import type { BuildDiagnostic }            from '../build/interfaces.js'
import type { ServiceLogRecord }           from '../logging/interfaces.js'

import { rm }                              from 'node:fs/promises'
import { join }                            from 'node:path'

import { SeverityNumber }                  from '@atls/logger'

import { WebpackConfig }                   from '../build/configuration.js'
import { LogRecordDecoder }                from '../logging/decoder.js'
import { loadWebpackRuntime }              from '../build/runtime.js'

export interface DevelopmentSessionInput {
  application: ApplicationInvocation
  cwd: string
  onDiagnostics?: (diagnostics: Array<BuildDiagnostic>) => void
  onLogRecord?: (record: ServiceLogRecord) => void
  onProgress?: (progress: { message: string; percent: number }) => void
  signal: AbortSignal
  workspacePackageNames?: Iterable<string>
}

export type DevelopmentSessionResult =
  | { error: unknown; status: 'provider-failed' }
  | { execution: ApplicationExecutionResult; status: 'launch-failed' }
  | { reason: unknown; status: 'cancelled' }

interface RunningApplication {
  controller: AbortController
  result: Promise<ApplicationExecutionResult>
}

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

const closeWatcher = async (watcher: wp.Watching): Promise<void> =>
  new Promise((resolve, reject) => {
    watcher.close((error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })

const collectDiagnostics = (stats: wp.Stats): Array<BuildDiagnostic> => {
  const { errors = [], warnings = [] } = stats.toJson({ all: false, errors: true, warnings: true })

  return [
    ...errors.map((record): BuildDiagnostic => ({ record, severityNumber: SeverityNumber.ERROR })),
    ...warnings.map((record): BuildDiagnostic => ({ record, severityNumber: SeverityNumber.WARN })),
  ]
}

const isSuccessfulStop = (result: ApplicationExecutionResult): boolean =>
  result.reason === 'cancelled' || (result.reason === 'completed' && result.exitCode === 0)

export const runDevelopmentSession = async ({
  application,
  cwd,
  onDiagnostics = () => undefined,
  onLogRecord = () => undefined,
  onProgress,
  signal,
  workspacePackageNames = [],
}: DevelopmentSessionInput): Promise<DevelopmentSessionResult> => {
  const outputPath = join(cwd, '.raijin', 'service', 'development')
  let compilation: Awaited<ReturnType<WebpackConfig['build']>> | undefined
  let compiler: wp.Compiler | undefined
  let watcher: wp.Watching | undefined
  let current: RunningApplication | undefined
  let stopping = false
  let queue = Promise.resolve()
  let settle: ((result: DevelopmentSessionResult) => void) | undefined
  const terminal = new Promise<DevelopmentSessionResult>((resolve) => {
    settle = resolve
  })

  const finish = (result: DevelopmentSessionResult): void => {
    if (!stopping) {
      settle?.(result)
    }
  }

  const stopCurrent = async (): Promise<void> => {
    const running = current

    current = undefined

    if (!running) {
      return
    }

    running.controller.abort(new Error('Application restart or shutdown requested'))

    const result = await running.result

    if (!isSuccessfulStop(result)) {
      throw new Error(`Application cleanup failed with ${result.reason}`)
    }
  }

  const startApplication = (): void => {
    if (stopping) {
      return
    }

    const controller = new AbortController()
    const decoder = new LogRecordDecoder()
    const result = application
      .execute({
        cancelSignal: controller.signal,
        cwd,
        entry: join(outputPath, 'index.js'),
        output: {
          mode: 'handle',
          handler: (event) => {
            decoder.push(event).forEach(onLogRecord)
          },
        },
      })
      .then((execution) => {
        decoder.flush().forEach(onLogRecord)

        return execution
      })
    const running = { controller, result }

    current = running

    result.then(
      (execution) => {
        if (current !== running || stopping) {
          return
        }

        current = undefined

        if (execution.reason !== 'completed' || execution.exitCode !== 0) {
          finish({ execution, status: 'launch-failed' })
        }
      },
      (error: unknown) => {
        if (current === running && !stopping) {
          current = undefined
          finish({ error, status: 'provider-failed' })
        }
      }
    )
  }

  const restartApplication = async (): Promise<void> => {
    await stopCurrent()
    startApplication()
  }

  const onAbort = (): void => {
    finish({ reason: signal.reason, status: 'cancelled' })
  }

  let result: DevelopmentSessionResult

  try {
    await rm(outputPath, { recursive: true, force: true })
    const { nodeLoaderPath, protoLoaderPath, tsLoaderPath, webpack } = await loadWebpackRuntime(cwd)
    compilation = await new WebpackConfig(
      webpack,
      { nodeLoader: nodeLoaderPath, protoLoader: protoLoaderPath, tsLoader: tsLoaderPath },
      cwd,
      outputPath,
      workspacePackageNames
    ).build(
      'development',
      onProgress
        ? [
            new webpack.ProgressPlugin((percent: number, message: string) => {
              onProgress({ message, percent: percent * 100 })
            }),
          ]
        : []
    )
    compiler = webpack(compilation.configuration)
    watcher = compiler.watch({}, (error, stats) => {
      queue = queue
        .then(async () => {
          if (stopping) {
            return
          }

          if (error) {
            finish({ error, status: 'provider-failed' })

            return
          }

          if (!stats) {
            finish({
              error: new Error('Webpack completed without compilation statistics'),
              status: 'provider-failed',
            })

            return
          }

          const diagnostics = collectDiagnostics(stats)

          onDiagnostics(diagnostics)

          if (!stats.hasErrors()) {
            await restartApplication()
          }
        })
        .catch((cause: unknown) => {
          finish({ error: cause, status: 'provider-failed' })
        })
    })

    if (signal.aborted) {
      onAbort()
    } else {
      signal.addEventListener('abort', onAbort, { once: true })
    }

    result = await terminal
  } catch (error) {
    result = { error, status: 'provider-failed' }
  }

  stopping = true
  signal.removeEventListener('abort', onAbort)

  try {
    if (watcher) {
      await closeWatcher(watcher)
    }

    await queue
    await stopCurrent()

    if (compiler) {
      await closeCompiler(compiler)
    }

    await compilation?.dispose()
    await rm(outputPath, { recursive: true, force: true })
  } catch (error) {
    result = { error, status: 'provider-failed' }
  }

  return result
}
