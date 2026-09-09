export interface TerminationSignal {
  dispose: () => void
  exitCode: () => number
  signal: AbortSignal
}

export const createTerminationSignal = (): TerminationSignal => {
  const controller = new AbortController()
  let exitCode = 0
  const onInterrupt = (): void => {
    exitCode = 130
    controller.abort('SIGINT')
  }
  const onTerminate = (): void => {
    exitCode = 143
    controller.abort('SIGTERM')
  }

  process.once('SIGINT', onInterrupt)
  process.once('SIGTERM', onTerminate)

  return {
    dispose: () => {
      process.off('SIGINT', onInterrupt)
      process.off('SIGTERM', onTerminate)
    },
    exitCode: () => exitCode,
    signal: controller.signal,
  }
}
