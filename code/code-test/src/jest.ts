import { AggregatedResult }  from '@jest/test-result'
import { Config }            from '@jest/types'
import { runCLI }            from '@jest/core'

import { integrationConfig } from './jest.config'
import { unitConfig }        from './jest.config'

const unit = async (
  project: string,
  options?: Partial<Config.Argv>,
  files?: string[]
): Promise<{
  results: AggregatedResult
  globalConfig: Config.GlobalConfig
}> => {
  const argv: any = {
    rootDir: project,
    ci: false,
    detectLeaks: false,
    detectOpenHandles: false,
    errorOnDeprecated: false,
    listTests: false,
    passWithNoTests: true,
    runTestsByPath: false,
    testLocationInResults: true,
    config: JSON.stringify(unitConfig),
    maxConcurrency: 5,
    notifyMode: 'failure-change',
    _: files || [],
    ...options,
  }

  return runCLI(argv, [project])
}

const integration = async (
  project: string,
  options?: Partial<Config.Argv>,
  files?: string[]
): Promise<{
  results: AggregatedResult
  globalConfig: Config.GlobalConfig
}> => {
  const argv: any = {
    rootDir: project,
    ci: false,
    detectLeaks: false,
    detectOpenHandles: false,
    errorOnDeprecated: false,
    listTests: false,
    passWithNoTests: true,
    runTestsByPath: false,
    testLocationInResults: true,
    config: JSON.stringify(integrationConfig),
    maxConcurrency: 5,
    notifyMode: 'failure-change',
    _: files || [],
    ...options,
  }

  return runCLI(argv, [project])
}

export { unit, integration }
