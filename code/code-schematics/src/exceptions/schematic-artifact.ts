export class SchematicArtifactException extends Error {
  constructor(candidates: Array<string>) {
    super(
      [
        'Raijin schematic artifact is missing.',
        'Run `yarn workspace @atls/code-schematics build` before using schematic helpers.',
        `Checked paths: ${candidates.join(', ')}`,
      ].join(' ')
    )
  }
}
