import type { LogRecord }          from '@atls/logger'
import type { ProcessOutputEvent } from '@atls/raijin/commands'

import type { ServiceLogRecord }   from './interfaces.js'

import { SeverityNumber }          from '@atls/logger'

const MIN_SEVERITY_NUMBER: number = SeverityNumber.UNSPECIFIED
const MAX_SEVERITY_NUMBER: number = SeverityNumber.FATAL4

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === 'string'

const isLoggerRecord = (value: unknown): value is LogRecord => {
  if (!isObjectRecord(value)) {
    return false
  }

  const { attributes, body, namespace, severityNumber, severityText, stack } = value

  return (
    typeof body === 'string' &&
    typeof severityNumber === 'number' &&
    Number.isInteger(severityNumber) &&
    severityNumber >= MIN_SEVERITY_NUMBER &&
    severityNumber <= MAX_SEVERITY_NUMBER &&
    (attributes === undefined || isObjectRecord(attributes)) &&
    isOptionalString(namespace) &&
    isOptionalString(severityText) &&
    isOptionalString(stack)
  )
}

const parseRecord = (body: string): ServiceLogRecord => {
  try {
    const record: unknown = JSON.parse(body)

    if (isLoggerRecord(record)) {
      return record
    }
  } catch {
    return { body, severityNumber: SeverityNumber.INFO }
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
