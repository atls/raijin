import type { Options } from 'globby'

export interface Invocation {
  readonly patterns: Array<string>
  readonly options: Options
}
