import type { JSX }           from 'react'

import { Text }               from 'ink'
import { Box }                from 'ink'
import { useCallback }        from 'react'
import MultiSelectPkg         from 'ink-multi-select'
import React                  from 'react'
import figures                from 'figures'

import { IndicatorComponent } from './select-indicator.component.jsx'
import { ItemComponent }      from './select-item.component.jsx'

// TODO: moduleResolution
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

const CheckboxComponent = ({ isSelected }: CheckboxComponentProps): JSX.Element => (
  <Box marginRight={1}>
    <Text>{!!isSelected && figures.circleFilled}</Text>
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
}: RequestCommitMessageAdditionalProps): JSX.Element => {
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
