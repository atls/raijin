import type { Input as ExecuteInput }   from '../inputs/execute.js'
import type { Result as ExecuteResult } from '../results/execute.js'

export interface Port {
  execute: (input: ExecuteInput) => Promise<ExecuteResult>
}
