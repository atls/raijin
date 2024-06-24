import { Text } from 'ink'
import { Box }  from 'ink'
import React    from 'react'
import figures  from 'figures'

export const IndicatorComponent = ({ isSelected = false }) => (
  <Box marginRight={1}>
    {isSelected ? <Text color='cyanBright'>{figures.pointer}</Text> : <Text> </Text>}
  </Box>
)
