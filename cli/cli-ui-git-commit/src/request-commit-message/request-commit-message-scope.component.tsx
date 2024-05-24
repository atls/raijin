import SelectPkg                 from 'ink-select-input'
import TextInputPkg              from 'ink-text-input'
import React                     from 'react'
import { Text }                  from 'ink'
import { Box }                   from 'ink'
import { UncontrolledTextInput } from 'ink-text-input'
import { useState }              from 'react'
import { useMemo }               from 'react'
import { useCallback }           from 'react'

import { COMMIT_SCOPE_ENUM }     from '@atls/code-commit'

import { IndicatorComponent }    from './select-indicator.component.jsx'
import { ItemComponent }         from './select-item.component.jsx'

// TODO: moduleResolution
const Select = SelectPkg as any
// TODO: moduleResolution
const TextInput = TextInputPkg as any

const scopes = Object.keys(COMMIT_SCOPE_ENUM).map((key) => ({
  label: COMMIT_SCOPE_ENUM[key].description,
  value: key,
}))

export const RequestCommitMessageScope = ({ onSubmit }) => {
  const [custom, setCustom] = useState(false)
  const [value, setValue] = useState('')

  const matches = useMemo(() => {
    if (value.length > 0) {
      return scopes.filter((item) => item.label.toLowerCase().includes(value.toLowerCase()))
    }

    return scopes
  }, [value])

  const hasSuggestion: boolean = useMemo(() => matches.length > 0, [matches])

  const onSubmitValue = useCallback(
    (v) => {
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
      {hasSuggestion && (
        <Select
          items={matches}
          onSelect={onSubmitValue}
          indicatorComponent={IndicatorComponent}
          itemComponent={ItemComponent}
        />
      )}
    </Box>
  )
}
