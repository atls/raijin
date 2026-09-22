import type { IndicatorProps } from 'ink-select-input'
import type { ItemProps }      from 'ink-select-input'
import type { ComponentType }  from 'react'
import type { FC }             from 'react'

import Select                  from 'ink-select-input'
import Input                   from 'ink-text-input'

interface SelectItem {
  label: string
  value: string
}

interface SelectProps {
  indicatorComponent: FC<IndicatorProps>
  initialIndex: number
  itemComponent: FC<ItemProps>
  items: Array<SelectItem>
  onSelect: (item: SelectItem) => void
}

interface TextInputProps {
  onChange: (value: string) => void
  value: string
}

export const SelectInput = Select as unknown as ComponentType<SelectProps>
export const TextInput = Input as unknown as ComponentType<TextInputProps>
