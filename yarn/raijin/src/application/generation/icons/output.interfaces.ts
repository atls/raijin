import type { IconModule } from './module.interfaces.js'

export interface IconOutputReplacer {
  replace: (cwd: string, modules: ReadonlyArray<IconModule>) => Promise<Array<string>>
}
