import type { ReactElement }  from 'react'

import { Text }               from 'ink'
import { Box }                from 'ink'
import { useState }           from 'react'
import { useMemo }            from 'react'
import Select                 from 'ink-select-input'
import TextInput              from 'ink-text-input'
import React                  from 'react'

import { COMMIT_TYPE_ENUM }   from '@monstrs/config-commitlint'

import { IndicatorComponent } from './select-indicator.component.jsx'
import { ItemComponent }      from './select-item.component.jsx'

const types: Array<{ label: string; value: string }> = Object.keys(COMMIT_TYPE_ENUM).map((key) => ({
  label: COMMIT_TYPE_ENUM[key as keyof typeof COMMIT_TYPE_ENUM].description,
  value: key,
}))

export interface RequestCommitMessageTypeProps {
  onSubmit: (value: string) => void
}

export const RequestCommitMessageType = ({
  onSubmit,
}: RequestCommitMessageTypeProps): ReactElement => {
  const [value, setValue] = useState('')

  const matches = useMemo(() => {
    if (value.length > 0) {
      return types.filter((item: { label: string; value: string }) =>
        item.label.toLowerCase().includes(value.toLowerCase()))
    }

    return types
  }, [value])
  const hasSuggestion: boolean = useMemo(() => matches.length > 0, [matches])

  return (
    <Box flexDirection='column'>
      <Box>
        <Box marginRight={1}>
          <Text bold color='cyanBright'>
            Type of commit:
          </Text>
        </Box>
        <TextInput value={value} onChange={setValue} />
      </Box>
      {!!hasSuggestion && (
        <Select
          items={matches}
          indicatorComponent={IndicatorComponent}
          itemComponent={ItemComponent}
          onSelect={(v): void => {
            onSubmit(v.value)
          }}
        />
      )}
    </Box>
  )
}
