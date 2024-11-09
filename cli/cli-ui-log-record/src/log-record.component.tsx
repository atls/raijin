import type { LogRecord as Record }        from '@atls/logger'
import type { ReactElement }               from 'react'

import { LOGGER_NAMESPACE_ATTRIBUTE_NAME } from '@atls/logger'
import { Box }                             from 'ink'
import React                               from 'react'

import { LogMessage }                      from './log-message.component.jsx'
import { LogMikroOrm }                     from './log-mikro-orm.component.jsx'
import { LogNamespace }                    from './log-namespace.component.jsx'
import { LogStackTrace }                   from './log-stack-trace.component.jsx'

export interface LogRecordProps extends Record {
  namespace?: string
  stack?: string
}

export const LogRecord = ({
  namespace,
  body,
  stack,
  attributes = {},
}: LogRecordProps): ReactElement => (
  <Box
    flexDirection='column'
    borderStyle='single'
    borderColor='gray'
    paddingX={2}
    paddingY={1}
    width='100%'
  >
    <Box flexDirection='row'>
      <Box flexGrow={1}>
        <Box paddingRight={1}>
          <LogNamespace>{namespace || attributes[LOGGER_NAMESPACE_ATTRIBUTE_NAME]}</LogNamespace>
        </Box>
        <Box>
          <LogMessage>{body}</LogMessage>
        </Box>
      </Box>
    </Box>
    <LogStackTrace>{stack || attributes['@stack']}</LogStackTrace>
    <LogMikroOrm>{attributes}</LogMikroOrm>
  </Box>
)
