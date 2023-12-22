import React    from 'react'
import figures  from 'figures'
// @ts-ignore
import { Text } from 'ink'
// @ts-ignore
import { Box }  from 'ink'

export const IndicatorComponent = ({ isSelected = false }) => (
  <Box marginRight={1}>
    {isSelected ? <Text color='cyanBright'>{figures.pointer}</Text> : <Text> </Text>}
  </Box>
)
