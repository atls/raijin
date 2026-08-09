export interface Failure {
  code: 'start-failed'
  message: string
}

export const create = (): Failure => ({
  code: 'start-failed',
  message: 'Managed Node execution failed to start',
})
