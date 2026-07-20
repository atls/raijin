import type { Report } from '@yarnpkg/core'

export type ProjectGenerationReport = Pick<Report, 'reportError' | 'reportInfo' | 'reportWarning'>
