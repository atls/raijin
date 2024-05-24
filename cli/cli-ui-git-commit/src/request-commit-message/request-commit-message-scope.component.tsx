import type { JSX }              from 'react'

import { Text }                  from 'ink'
import { Box }                   from 'ink'
import { UncontrolledTextInput } from 'ink-text-input'
import { useState }              from 'react'
import { useMemo }               from 'react'
import { useCallback }           from 'react'
import Select                    from 'ink-select-input'
import TextInput                 from 'ink-text-input'
import React                     from 'react'

import { COMMIT_SCOPE_ENUM }     from '@atls/code-commit'

import { IndicatorComponent }    from './select-indicator.component.jsx'
import { ItemComponent }         from './select-item.component.jsx'

const scopes = Object.keys(COMMIT_SCOPE_ENUM).map((key) => ({
  // @ts-expect-error
  label: COMMIT_SCOPE_ENUM[key].description,
  value: key,
}))

export interface RequestCommitMessageScopeProps {
  onSubmit: (value: string) => void
}

export const RequestCommitMessageScope = ({
  onSubmit,
}: RequestCommitMessageScopeProps): JSX.Element => {
  const [custom, setCustom] = useState(false)
  const [value, setValue] = useState('')

  const matches = useMemo(() => {
    if (value.length > 0) {
      return scopes.filter((item: { label: string; value: string }) =>
        item.label.toLowerCase().includes(value.toLowerCase()))
    }

    return scopes
  }, [value])

  const hasSuggestion: boolean = useMemo(() => matches.length > 0, [matches])

  const onSubmitValue = useCallback(
    (v: { value: string }) => {
      if (v.value === 'custom') {
        setCustom(true)
      } else {
        onSubmit(v.value)
      }
    },
    [setCustom, onSubmit]
  )

  if (custom) {
    return (
      <Box flexDirection='column'>
        <Box>
          <Text bold color='cyanBright'>
            Please state the scope of the change:
          </Text>
        </Box>
        <Box>
          <Box marginRight={1}>
            <Text color='gray'>→</Text>
          </Box>
          <Box>
            <UncontrolledTextInput onSubmit={onSubmit} />
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection='column'>
      <Box>
        <Box marginRight={1}>
          <Text bold color='cyanBright'>
            Type of scope:
          </Text>
        </Box>
        <TextInput value={value} onChange={setValue} />
      </Box>
      {!!hasSuggestion && (
        <Select
          items={matches}
          indicatorComponent={IndicatorComponent}
          itemComponent={ItemComponent}
          onSelect={onSubmitValue}
        />
      )}
    </Box>
  )
}
