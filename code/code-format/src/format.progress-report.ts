export interface FormatProgressReport {
  start(files: Array<string>): void
  format(file: string): void
  end(): void
}

export class NullFormatProgressReport implements FormatProgressReport {
  start() {}

  format() {}

  end() {}
}
