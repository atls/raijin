import type { Report } from '@yarnpkg/core'

export type RenderReport = Pick<Report, 'reportError' | 'reportInfo' | 'reportWarning'>
