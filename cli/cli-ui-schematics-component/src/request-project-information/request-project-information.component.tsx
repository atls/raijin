import type { FC }            from 'react'

import { Text }               from 'ink'
import { Box }                from 'ink'
import { useEffect }          from 'react'
import { useState }           from 'react'
import Select                 from 'ink-select-input'
import React                  from 'react'

import { IndicatorComponent } from '@atls/cli-ui-parts'
import { ProjectType }        from '@atls/schematics'

const Submit = ({ onSubmit, ...props }: any) => {
  // eslint-disable-next-line
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

export const RequestProjectInformation: FC<RequestProjectInformationProps> = ({ onSubmit }) => {
  const [type, setType] = useState<ProjectType>()
  if (!type) {
    return (
      <Box flexDirection='column'>
        <Box marginRight={1}>
          <Text bold color='cyanBright'>
            Type of project:
          </Text>
        </Box>
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
          // eslint-disable-next-line
          onSelect={(v) => setType(v.value)}
          indicatorComponent={IndicatorComponent}
        />
      </Box>
    )
  }

  return <Submit type={type} onSubmit={onSubmit} />
}
