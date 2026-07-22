import type { ScaffoldInput }        from './input.interfaces.js'
import type { ScaffoldType }         from './input.interfaces.js'
import type { ScaffoldTypeResult }   from './input.interfaces.js'
import type { ScaffoldResult }       from './result.interfaces.js'
import type { ScaffoldDependencies } from './use-case.interfaces.js'

const SCAFFOLD_TYPES = ['library', 'project'] as const satisfies ReadonlyArray<ScaffoldType>

const isScaffoldType = (value: string): value is ScaffoldType =>
  (SCAFFOLD_TYPES as ReadonlyArray<string>).includes(value)

const getFailureMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export const resolveScaffoldType = (value: string): ScaffoldTypeResult => {
  if (isScaffoldType(value)) {
    return {
      status: 'accepted',
      scaffoldType: value,
    }
  }

  return {
    status: 'rejected',
    failure: {
      code: 'invalid-scaffold-type',
      message: `Unsupported project scaffold type "${value}". Expected one of: ${SCAFFOLD_TYPES.join(', ')}.`,
    },
  }
}

export const scaffoldProject = async (
  input: ScaffoldInput,
  { scaffolder }: ScaffoldDependencies
): Promise<ScaffoldResult> => {
  try {
    return await scaffolder.generate(input)
  } catch (error) {
    return {
      status: 'failed',
      changes: [],
      diagnostics: [],
      failure: {
        code: 'project-scaffold-unexpected-failure',
        message: `Project scaffold failed unexpectedly: ${getFailureMessage(error)}`,
      },
    }
  }
}
