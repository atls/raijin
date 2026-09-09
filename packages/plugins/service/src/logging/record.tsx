import type { LogRecord as Record }        from '@atls/logger'
import type { ReactElement }               from 'react'

import { LOGGER_NAMESPACE_ATTRIBUTE_NAME } from '@atls/logger'
import { Box }                             from 'ink'
import React                               from 'react'

import { LogMessage }                      from './message.jsx'
import { LogMikroOrm }                     from './mikro-orm.jsx'
import { LogNamespace }                    from './namespace.jsx'
import { LogStackTrace }                   from './stack-trace.jsx'

const LOG_STACK_ATTRIBUTE_NAME = '@stack'

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
    <LogStackTrace>{stack || attributes[LOG_STACK_ATTRIBUTE_NAME]}</LogStackTrace>
    <LogMikroOrm>{attributes}</LogMikroOrm>
  </Box>
)
