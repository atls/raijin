import type { CheckBoxProps }      from 'ink-multi-select'
import type { IndicatorProps }     from 'ink-multi-select'
import type { ListedItem }         from 'ink-multi-select'
import type { MultiSelectProps }   from 'ink-multi-select'
import type { ComponentType }      from 'react'
import type { ReactElement }       from 'react'

import type { CommitMessageInput } from '../input.js'

import { Text }                    from 'ink'
import { Box }                     from 'ink'
import { useCallback }             from 'react'
import MultiSelectPackage          from 'ink-multi-select'
import React                       from 'react'
import figures                     from 'figures'

import { ItemComponent }           from './select-item.jsx'

const isMultiSelectComponent = (value: unknown): value is ComponentType<MultiSelectProps> =>
  typeof value === 'function'

const resolveMultiSelectComponent = (value: unknown): ComponentType<MultiSelectProps> => {
  const defaultExport =
    typeof value === 'object' && value !== null ? Reflect.get(value, 'default') : undefined

  if (isMultiSelectComponent(defaultExport)) {
    return defaultExport
  }

  if (isMultiSelectComponent(value)) {
    return value
  }

  throw new TypeError('ink-multi-select did not provide a component export.')
}

const MultiSelect = resolveMultiSelectComponent(MultiSelectPackage)

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

const CheckboxComponent = ({ isSelected = false }: CheckBoxProps): ReactElement => (
  <Box marginRight={1}>{isSelected ? <Text>{figures.circleFilled}</Text> : <Text> </Text>}</Box>
)

export const IndicatorComponent = ({ isHighlighted = false }: IndicatorProps): ReactElement => (
  <Box marginRight={1}>
    {isHighlighted ? <Text color='cyanBright'>{figures.pointer}</Text> : <Text> </Text>}
  </Box>
)

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

  const onSubmitValues = useCallback(
    (values: Array<ListedItem>) => {
      onSubmit(
        values.reduce<AdditionalProperties>((result, { value }) => {
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

  return (
    <Box flexDirection='column'>
      <Box>
        <Text bold color='cyanBright'>
          Please select additional actions:
        </Text>
      </Box>
      <Box>
        <MultiSelect
          items={COMMIT_ADDITIONAL}
          defaultSelected={defaultSelected}
          indicatorComponent={IndicatorComponent}
          itemComponent={ItemComponent}
          checkboxComponent={CheckboxComponent}
          onSubmit={onSubmitValues}
        />
      </Box>
    </Box>
  )
}
