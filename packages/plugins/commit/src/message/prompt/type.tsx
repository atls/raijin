import type { ReactElement }  from 'react'

import { Text }               from 'ink'
import { Box }                from 'ink'
import { useState }           from 'react'
import { useMemo }            from 'react'
import Select                 from 'ink-select-input'
import TextInput              from 'ink-text-input'
import React                  from 'react'

import { COMMIT_TYPE_ENUM }   from '../type-options.js'
import { IndicatorComponent } from './select-indicator.jsx'
import { ItemComponent }      from './select-item.jsx'

const types: Array<{ label: string; value: string }> = Object.keys(COMMIT_TYPE_ENUM).map((key) => ({
  label: COMMIT_TYPE_ENUM[key as keyof typeof COMMIT_TYPE_ENUM].description,
  value: key,
}))

export interface RequestCommitMessageTypeProps {
  initialValue?: string
  onSubmit: (value: string) => void
}

export const RequestCommitMessageType = ({
  initialValue,
  onSubmit,
}: RequestCommitMessageTypeProps): ReactElement => {
  const [value, setValue] = useState('')

  const matches = useMemo(() => {
    if (value.length > 0) {
      return types.filter((item: { label: string; value: string }) => {
        const query = value.toLowerCase()

        return item.label.toLowerCase().includes(query) || item.value.includes(query)
      })
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
          initialIndex={Math.max(
            0,
            matches.findIndex((item) => item.value === initialValue)
          )}
          onSelect={(v): void => {
            onSubmit(v.value)
          }}
        />
      )}
    </Box>
  )
}
