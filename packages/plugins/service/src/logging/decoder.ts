import type { ProcessOutputEvent } from '@atls/raijin/commands'

import type { ServiceLogRecord }   from './interfaces.js'

import { SeverityNumber }          from '@atls/logger'

const parseRecord = (body: string): ServiceLogRecord => {
  try {
    const record: unknown = JSON.parse(body)

    if (record && typeof record === 'object') {
      return record as ServiceLogRecord
    }
  } catch {
    // Plain application output is represented as an informational log record.
  }

  return { body, severityNumber: SeverityNumber.INFO }
}

export class LogRecordDecoder {
  private readonly buffers = { stderr: '', stdout: '' }

  push({ data, source }: ProcessOutputEvent): Array<ServiceLogRecord> {
    const rows = `${this.buffers[source]}${data}`.split(/\r?\n/)

    this.buffers[source] = rows.pop() ?? ''

    return rows.filter(Boolean).map(parseRecord)
  }

  flush(): Array<ServiceLogRecord> {
    const records = (['stdout', 'stderr'] as const).flatMap((source) => {
      const body = this.buffers[source]

      this.buffers[source] = ''

      return body ? [parseRecord(body)] : []
    })

    return records
  }
}
