import type { ReactElement }  from 'react'

import { Text }               from 'ink'
import { Box }                from 'ink'
import Select                 from 'ink-select-input'
import React                  from 'react'

import { IndicatorComponent } from './select-indicator.jsx'
import { ItemComponent }      from './select-item.jsx'

export interface RequestCommitMessageScopeProps {
  initialValue?: string
  scopes: Array<string>
  onSubmit: (value: string) => void
}

export const RequestCommitMessageScope = ({
  initialValue,
  scopes,
  onSubmit,
}: RequestCommitMessageScopeProps): ReactElement => {
  const items = scopes.map((scope) => ({ label: '', value: scope }))

  return (
    <Box flexDirection='column'>
      <Box>
        <Text bold color='cyanBright'>
          Scope:
        </Text>
      </Box>
      <Select
        items={items}
        indicatorComponent={IndicatorComponent}
        itemComponent={ItemComponent}
        initialIndex={Math.max(
          0,
          items.findIndex((item) => item.value === initialValue)
        )}
        onSelect={(item): void => {
          onSubmit(item.value)
        }}
      />
    </Box>
  )
}
