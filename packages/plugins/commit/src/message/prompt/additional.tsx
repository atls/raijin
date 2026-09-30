import type { ReactElement }       from 'react'

import type { CommitMessageInput } from '../input.js'

import { Text }                    from 'ink'
import { Box }                     from 'ink'
import { useInput }                from 'ink'
import { useCallback }             from 'react'
import { useState }                from 'react'
import React                       from 'react'
import figures                     from 'figures'

const COMMIT_ADDITIONAL = [
  {
    label: 'Add a scope',
    value: 'scope',
  },
  {
    label: 'Resolves issues',
    value: 'issues',
  },
  {
    label: 'Introduces breaking changes',
    value: 'breaking',
  },
  {
    label: 'Add a long description',
    value: 'body',
  },
  {
    label: 'Skip ci/cd setups',
    value: 'skipci',
  },
]

export interface AdditionalProperties {
  scope?: boolean
  issues?: boolean
  breaking?: boolean
  body?: boolean
  skipci?: boolean
}

interface RequestCommitMessageAdditionalProps {
  initialValue?: CommitMessageInput
  onSubmit: (props: AdditionalProperties) => void
}

export const RequestCommitMessageAdditional = ({
  initialValue,
  onSubmit,
}: RequestCommitMessageAdditionalProps): ReactElement => {
  const defaultSelected = COMMIT_ADDITIONAL.filter(({ value }) =>
    value === 'scope'
      ? initialValue?.scope !== undefined || !initialValue
      : initialValue?.[value as keyof CommitMessageInput])

  const [highlighted, setHighlighted] = useState(0)
  const [selected, setSelected] = useState(() => new Set(defaultSelected.map(({ value }) => value)))
  const onSubmitValues = useCallback(
    (values: ReadonlySet<string>) => {
      onSubmit(
        [...values].reduce<AdditionalProperties>((result, value) => {
          switch (value) {
            case 'scope':
              return { ...result, scope: true }
            case 'issues':
              return { ...result, issues: true }
            case 'breaking':
              return { ...result, breaking: true }
            case 'body':
              return { ...result, body: true }
            case 'skipci':
              return { ...result, skipci: true }
            default:
              return result
          }
        }, {})
      )
    },
    [onSubmit]
  )

  useInput((input, key) => {
    if (key.upArrow) {
      setHighlighted((index) => (index + COMMIT_ADDITIONAL.length - 1) % COMMIT_ADDITIONAL.length)
    } else if (key.downArrow) {
      setHighlighted((index) => (index + 1) % COMMIT_ADDITIONAL.length)
    } else if (input === ' ') {
      const { value } = COMMIT_ADDITIONAL[highlighted]

      setSelected((current) => {
        const next = new Set(current)

        if (next.has(value)) {
          next.delete(value)
        } else {
          next.add(value)
        }

        return next
      })
    } else if (key.return) {
      onSubmitValues(selected)
    }
  })

  return (
    <Box flexDirection='column'>
      <Box>
        <Text bold color='cyanBright'>
          Please select additional actions:
        </Text>
      </Box>
      {COMMIT_ADDITIONAL.map((item, index) => (
        <Box key={item.value}>
          <Box marginRight={1}>
            {index === highlighted ? (
              <Text color='cyanBright'>{figures.pointer}</Text>
            ) : (
              <Text> </Text>
            )}
          </Box>
          <Box marginRight={1}>
            <Text>{selected.has(item.value) ? figures.circleFilled : figures.circle}</Text>
          </Box>
          <Text>{item.label}</Text>
        </Box>
      ))}
    </Box>
  )
}
