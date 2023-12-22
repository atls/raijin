import React    from 'react'
// @ts-ignore
import { Text } from 'ink'
// @ts-ignore
import { Box }  from 'ink'

export const ItemComponent = ({ label, value }: any) => (
  <Box>
    <Box width={12}>
      <Text bold color='#d7875f'>
        {value}
      </Text>
    </Box>
    <Text>{label}</Text>
  </Box>
)
