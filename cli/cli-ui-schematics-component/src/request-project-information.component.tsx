import Select                 from 'ink-select-input'
import React                  from 'react'
import { Box }                from 'ink'
import { Text }               from 'ink'
import { useEffect }          from 'react'
import { useState }           from 'react'

import { IndicatorComponent } from '@atls/cli-ui-parts'
import { ProjectType }        from '@atls/schematics'

const Submit = ({ onSubmit, ...props }) => {
  useEffect(() => {
    onSubmit(props)
  }, [props, onSubmit])
  return null
}

export interface ProjectInformationProperties {
  type: ProjectType
}

interface RequestProjectInformationProps {
  onSubmit: (props: ProjectInformationProperties) => void
}

export const RequestProjectInformation = ({ onSubmit }: RequestProjectInformationProps) => {
  const [type, setType] = useState<ProjectType>()

  if (!type) {
    return (
      <Box flexDirection='column'>
        <Box marginRight={1}>
          <Text bold color='cyanBright'>
            Type of project:
          </Text>
        </Box>
        {/* @ts-ignore */}
        <Select
          items={[
            {
              label: 'Project',
              value: ProjectType.PROJECT,
            },
            {
              label: 'Libraries',
              value: ProjectType.LIBRARIES,
            },
          ]}
          onSelect={(v) => setType(v.value)}
          // @ts-ignore
          indicatorComponent={IndicatorComponent}
        />
      </Box>
    )
  }

  return <Submit type={type} onSubmit={onSubmit} />
}
