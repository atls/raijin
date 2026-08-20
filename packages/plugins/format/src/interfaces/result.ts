export type FormattedFileResult = {
  readonly file: string
  readonly status: 'changed' | 'unchanged'
}

export type FormatProjectResult = {
  readonly files: ReadonlyArray<FormattedFileResult>
}
