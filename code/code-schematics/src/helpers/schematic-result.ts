import { SchematicWorkflowException } from '../exceptions/index.js'

export const ensureSchematicSucceeded = (exitCode: 0 | 1): void => {
  if (exitCode !== 0) {
    throw new SchematicWorkflowException(exitCode)
  }
}
