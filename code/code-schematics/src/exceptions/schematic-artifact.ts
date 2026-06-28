export class SchematicArtifactException extends Error {
  constructor(candidates: Array<string>) {
    super(
      [
        '@atls/code-schematics schematic artifact is missing or incomplete.',
        'Run `yarn workspace @atls/code-schematics build` before executing schematics.',
        `Checked paths: ${candidates.join(', ')}`,
      ].join(' ')
    )
  }
}
