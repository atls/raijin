import type { Record }  from '@atls/logger'
import type { FC }      from 'react'

import { Box }          from 'ink'
import React            from 'react'

import { LogBody }      from './log-body.component.jsx'
import { LogMessage }   from './log-message.component.jsx'
import { LogNamespace } from './log-namespace.component.jsx'

export interface LogRecordProps extends Partial<Record> {}

export const LogRecord: FC<LogRecordProps> = ({ severityText = 'TRACE', name, body }) => (
  <Box flexDirection='column'>
    <Box flexDirection='row'>
      <Box flexGrow={1}>
        <Box paddingRight={1}>{name && <LogNamespace>{name}</LogNamespace>}</Box>
        <Box>
          <LogMessage>{body}</LogMessage>
        </Box>
      </Box>
    </Box>
    <LogBody>{body}</LogBody>
  </Box>
)
