import { StreamReport }              from '@yarnpkg/core'

import type { FormatProgressReport } from '@atls/yarn-runtime'

export class ProgressReport implements FormatProgressReport {
  progress!: any

  constructor(private readonly report: StreamReport) {}

  start(files: Array<string>) {
    this.progress = StreamReport.progressViaCounter(files.length)
    this.report.reportProgress(this.progress)
  }

  format() {
    this.progress.tick()
  }

  end() {}
}
