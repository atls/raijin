import type { ReactElement } from 'react'

import { Text }              from 'ink'
import { Box }               from 'ink'
import React                 from 'react'

export interface ItemComponentProps {
  label: string
  value?: string
}

export const ItemComponent = ({ label, value }: ItemComponentProps): ReactElement => (
  <Box>
    <Box width={12}>
      <Text bold color='#d7875f'>
        {value}
      </Text>
    </Box>
    <Text>{label}</Text>
  </Box>
)
