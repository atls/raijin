import React            from 'react'
import { FC }           from 'react'
import { Box }          from 'ink'
import { Record }       from '@atls/logger'
import { SeverityName } from '@atls/logger'

import { LogSeverity }  from './log-severity.component'
import { LogNamespace } from './log-namespace.component'
import { LogMessage }   from './log-message.component'
import { LogBody }      from './log-body.component'

export interface LogRecordProps extends Partial<Record> {}

export const LogRecord: FC<LogRecordProps> = ({
  severityText = SeverityName.TRACE,
  name,
  body,
}) => (
  <Box flexDirection='column'>
    <Box flexDirection='row'>
      <Box flexGrow={1}>
        <Box paddingRight={1}>
          <LogSeverity>{severityText}</LogSeverity>
        </Box>
        <Box paddingRight={1}>{name && <LogNamespace>{name}</LogNamespace>}</Box>
        <Box>
          <LogMessage>{body}</LogMessage>
        </Box>
      </Box>
    </Box>
    <LogBody>{body}</LogBody>
  </Box>
)
