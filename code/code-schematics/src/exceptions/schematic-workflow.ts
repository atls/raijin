export class SchematicWorkflowException extends Error {
  constructor(exitCode: number) {
    super(`Schematic workflow failed with exit code ${exitCode}`)
  }
}
