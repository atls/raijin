import React            from 'react'
import { EOL }          from 'os'
import { Transform }    from 'stream'

import { LogRecord }    from '@atls/cli-ui-log-record-component'
import { renderStatic } from '@atls/cli-ui-renderer'

export class PrettyLogsTransform extends Transform {
  // eslint-disable-next-line consistent-return
  parse(row) {
    try {
      if (row) {
        const data = JSON.parse(row)

        if (data && !data.body) {
          return {
            body: data,
          }
        }

        return data
      }
    } catch (error) {
      return {
        body: row,
      }
    }
  }

  render(data = {}) {
    return renderStatic(<LogRecord {...data} />)
  }

  // eslint-disable-next-line no-underscore-dangle
  _transform(chunk, encoding, callback) {
    const parts = chunk.toString().split(/\r?\n/)

    parts
      .map(this.parse)
      .filter(Boolean)
      .map(this.render)
      .forEach((row) => {
        this.push(`${row}${EOL}`)
      })

    callback()
  }
}
