/* eslint-disable consistent-return */

import React            from 'react'
import { Transform }    from 'stream'
import { EOL }          from 'os'

import { renderStatic } from '@atls/cli-ui-renderer'
import { LogRecord }    from '@atls/cli-ui-log-record-component'

export class PrettyLogsTransform extends Transform {
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
