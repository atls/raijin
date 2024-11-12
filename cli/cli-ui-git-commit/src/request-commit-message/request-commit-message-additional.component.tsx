import type { ReactElement } from 'react'

import { Text }              from 'ink'
import { Box }               from 'ink'
import { useCallback }       from 'react'
import MultiSelectPkg        from 'ink-multi-select'
import React                 from 'react'
import figures               from 'figures'

import { ItemComponent }     from './select-item.component.jsx'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MultiSelect = (MultiSelectPkg as any).default || (MultiSelectPkg as any)

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

interface CheckboxComponentProps {
  isSelected: boolean
}

const CheckboxComponent = ({ isSelected = false }: CheckboxComponentProps): ReactElement => (
  <Box marginRight={1}>{isSelected ? <Text>{figures.circleFilled}</Text> : <Text> </Text>}</Box>
)

export const IndicatorComponent = ({
  isHighlighted = false,
}: {
  isHighlighted: boolean
}): ReactElement => (
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
  onSubmit: (props: AdditionalProperties) => void
}

export const RequestCommitMessageAdditional = ({
  onSubmit,
}: RequestCommitMessageAdditionalProps): ReactElement => {
  const onSubmitValues = useCallback(
    (values: Array<{ value: string }>) => {
      onSubmit(
        values.reduce(
          (result, value) => ({
            ...result,
            [value.value]: true,
          }),
          {}
        )
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
          indicatorComponent={IndicatorComponent}
          itemComponent={ItemComponent}
          checkboxComponent={CheckboxComponent}
          onSubmit={onSubmitValues}
        />
      </Box>
    </Box>
  )
}
