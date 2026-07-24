import type { ScaffoldFailure } from './result.interfaces.js'

export type ScaffoldType = 'library' | 'project'

export interface ScaffoldInput {
  readonly scaffoldType: ScaffoldType
  readonly targetPath: string
}

export interface ScaffoldTypeAccepted {
  readonly status: 'accepted'
  readonly scaffoldType: ScaffoldType
}

export interface ScaffoldTypeRejected {
  readonly status: 'rejected'
  readonly failure: ScaffoldFailure
}

export type ScaffoldTypeResult = ScaffoldTypeAccepted | ScaffoldTypeRejected
