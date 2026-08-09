import type { Input as ExecuteInput }   from './input.js'
import type { Result as ExecuteResult } from './result.js'

export interface Port {
  execute: (input: ExecuteInput) => Promise<ExecuteResult>
}
