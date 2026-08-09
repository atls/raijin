export interface Failure {
  code: 'cleanup-failed'
  message: string
}

export const create = (): Failure => ({
  code: 'cleanup-failed',
  message: 'Managed Node temporary resource cleanup failed',
})
