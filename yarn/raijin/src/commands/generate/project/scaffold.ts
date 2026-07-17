import type { ScaffoldType } from './scaffold.interfaces.js'

export const SCAFFOLD_TYPES: ReadonlyArray<ScaffoldType> = ['project', 'library']

export const isScaffoldType = (value: string): value is ScaffoldType =>
  SCAFFOLD_TYPES.includes(value as ScaffoldType)
