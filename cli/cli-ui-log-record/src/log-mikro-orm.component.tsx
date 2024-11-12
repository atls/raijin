import type { LogAttributes }           from '@monstrs/logger'
import type { LogAttributeValue }       from '@monstrs/logger'
import type { ReactElement }            from 'react'

import { SqlHighlighter }               from '@mikro-orm/sql-highlighter'
import { LOGGER_SQL_ATTRIBUTE_NAME }    from '@monstrs/mikro-orm-logger'
import { LOGGER_PARAMS_ATTRIBUTE_NAME } from '@monstrs/mikro-orm-logger'
import { Text }                         from 'ink'
import { Box }                          from 'ink'
import { nanoid }                       from 'nanoid'
import { format }                       from 'sql-formatter'
import React                            from 'react'

export interface LogMikroOrmProps {
  children?: LogAttributes
}

export const LogMikroOrmSql = ({
  children,
}: {
  children?: LogAttributeValue
}): ReactElement | null => {
  if (children) {
    return (
      <Box paddingLeft={4}>
        <Text>SQL:</Text>
        <Text>{'    '}</Text>
        <Text>
          {new SqlHighlighter().highlight(format(children as string, { language: 'postgresql' }))}
        </Text>
      </Box>
    )
  }

  return null
}

export const LogMikroOrmParameters = ({
  children,
}: {
  children?: LogAttributeValue
}): ReactElement | null => {
  if (children && Array.isArray(children) && children.length > 0) {
    const params = (children as Array<string>).reduce<Array<ReactElement<unknown, string>>>((
      result,
      param,
      index
    ) => {
      result.push(
        <Text key={nanoid()} color='yellow'>
          {param}
        </Text>
      )

      if (index < children.length - 1) {
        result.push(
          <Text key={nanoid()} color='white'>
            ,
          </Text>
        )
      }

      return result
    }, [])

    return (
      <Box paddingLeft={4} marginTop={1}>
        <Text>PARAMS:</Text>
        <Text> </Text>
        <Text color='white'>[</Text>
        {params}
        <Text color='white'>]</Text>
      </Box>
    )
  }

  return null
}

export const LogMikroOrm = ({ children }: LogMikroOrmProps): ReactElement | null => {
  if (!children) {
    return null
  }

  return (
    <Box marginTop={1} flexDirection='column'>
      <LogMikroOrmSql>{children[LOGGER_SQL_ATTRIBUTE_NAME]}</LogMikroOrmSql>
      <LogMikroOrmParameters>{children[LOGGER_PARAMS_ATTRIBUTE_NAME]}</LogMikroOrmParameters>
    </Box>
  )
}
