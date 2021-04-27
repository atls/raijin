/* eslint-disable no-shadow */

export enum AnnotationLevel {
  Warning = 'warning',
  Failure = 'failure',
}

export interface Annotation {
  path: string
  start_line: number
  end_line: number
  annotation_level: AnnotationLevel
  raw_details: string
  title: string
  message: string
}

export type CheckStatus = 'completed'

export enum Conclusion {
  Success = 'success',
  Failure = 'failure',
  Neutral = 'neutral',
  Cancelled = 'cancelled',
  TimedOut = 'timed_out',
  ActionRequired = 'action_required',
}
