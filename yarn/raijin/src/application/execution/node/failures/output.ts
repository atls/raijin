export interface Failure {
  code: 'output-failed'
  message: string
}

export const create = (): Failure => ({
  code: 'output-failed',
  message: 'Managed Node output handling failed',
})
