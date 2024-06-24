import { Text } from 'ink'
import { Box }  from 'ink'
import React    from 'react'

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
