export interface FormattedSource {
  readonly file: string
  readonly status: 'changed' | 'unchanged'
}

export interface FormatSourcesResult {
  readonly files: ReadonlyArray<FormattedSource>
}
