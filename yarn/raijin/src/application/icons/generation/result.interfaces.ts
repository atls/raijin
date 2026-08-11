export type Result =
  | {
      components: Array<string>
      reason: 'duplicate-components'
      status: 'rejected'
    }
  | {
      exitCode: number
      files: Array<string>
      reason: 'format-failed' | 'lint-failed'
      status: 'failed'
    }
  | {
      files: Array<string>
      status: 'generated'
    }
