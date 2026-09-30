import type { LogRecord }            from '@atls/logger'
import type { ProcessOutputEvent }   from '@atls/raijin/commands'

import type { BuildDiagnostic }      from '../build/interfaces.js'
import type { ServiceLogRecord }     from './interfaces.js'

import { SeverityNumber }            from '@atls/logger'

import { isRenderableLogAttributes } from './attributes.js'

const MIN_SEVERITY_NUMBER: number = SeverityNumber.UNSPECIFIED
const MAX_SEVERITY_NUMBER: number = SeverityNumber.FATAL4

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === 'string'

const isBuildDiagnostic = (value: unknown): value is BuildDiagnostic => {
  if (!isObjectRecord(value)) {
    return false
  }

  const { record, severityNumber } = value
  const isRecord =
    typeof record === 'string' ||
    (isObjectRecord(record) &&
      typeof record.message === 'string' &&
      isOptionalString(record.details))

  return (
    isRecord && (severityNumber === SeverityNumber.ERROR || severityNumber === SeverityNumber.WARN)
  )
}

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
    (attributes === undefined ||
      (isObjectRecord(attributes) && isRenderableLogAttributes(attributes))) &&
    isOptionalString(namespace) &&
    isOptionalString(severityText) &&
    isOptionalString(stack) &&
    !('record' in value)
  )
}

const parseRecord = (body: string): ServiceLogRecord => {
  try {
    const record: unknown = JSON.parse(body)

    if (isBuildDiagnostic(record) || isLoggerRecord(record)) {
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
