import { EOL }          from 'node:os'
import { Transform }    from 'node:stream'

import React            from 'react'

import { LogRecord }    from '@atls/cli-ui-log-record-component'
import { renderStatic } from '@atls/cli-ui-renderer'

export class PrettyLogsTransform extends Transform {
  parse(row: string): object {
    try {
      if (row) {
        const data: { body?: string } = JSON.parse(row)

        if (data?.body) {
          return data
        }
      }
    } catch {} // eslint-disable-line

    return {
      body: row,
    }
  }

  render(data: object = {}): string {
    return renderStatic(<LogRecord {...data} />)
  }

  // eslint-disable-next-line no-underscore-dangle
  override _transform(chunk: Buffer, _: string, callback: () => void): void {
    const parts = chunk.toString().split(/\r?\n/)

    parts
      .map(this.parse)
      .filter(Boolean)
      .map((data: object) => this.render(data))
      .forEach((row: string) => {
        this.push(`${row}${EOL}`)
      })

    callback()
  }
}
