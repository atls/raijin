import type { FC }   from 'react'

import { Text }      from 'ink'
import { Box }       from 'ink'
import { useEffect } from 'react'
import { useState }  from 'react'
import Select        from 'ink-select-input'
import React         from 'react'

const enum ProjectType {
  Project = 'project',
  Libraries = 'libraries',
}

interface SubmitProps {
  onSubmit: (props: ProjectInformationProperties) => void
}

const Submit = ({ onSubmit, ...props }: ProjectInformationProperties & SubmitProps): null => {
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

// TODO: refactor for usage in new plugin
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
              value: ProjectType.Project,
            },
            {
              label: 'Libraries',
              value: ProjectType.Libraries,
            },
          ]}
          // eslint-disable-next-line
          onSelect={(v) => setType(v.value)}
        />
      </Box>
    )
  }

  return <Submit type={type} onSubmit={onSubmit} />
}
