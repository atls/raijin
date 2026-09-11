import type { FC }                        from 'react'

import type { AdditionalProperties }      from './additional.jsx'

import { useEffect }                      from 'react'
import { useState }                       from 'react'
import React                              from 'react'

import { RequestCommitMessageAdditional } from './additional.jsx'
import { RequestCommitMessageBody }       from './body.jsx'
import { RequestCommitMessageBreaking }   from './breaking.jsx'
import { RequestCommitMessageIssues }     from './issues.jsx'
import { RequestCommitMessageScope }      from './scope.jsx'
import { RequestCommitMessageSubject }    from './subject.jsx'
import { RequestCommitMessageType }       from './type.jsx'

export interface CommitProperties {
  type: string
  subject: string
  scope?: string
  body?: string
  breaking?: string
  issues?: string
  skipci?: boolean
}

interface SubmitProps extends CommitProperties {
  onSubmit: (value: CommitProperties) => void
}

const Submit: FC<SubmitProps> = ({ onSubmit, ...props }): null => {
  useEffect(() => {
    onSubmit(props)
  }, [props, onSubmit])

  return null
}

interface RequestCommitMessageProps {
  onSubmit: (props: CommitProperties) => void
}

export const RequestCommitMessage: FC<RequestCommitMessageProps> = ({ onSubmit }) => {
  const [type, setType] = useState<string | undefined>()
  const [scope, setScope] = useState<string | undefined>()
  const [subject, setSubject] = useState<string | undefined>()
  const [issues, setIssues] = useState<string | undefined>()
  const [body, setBody] = useState<string | undefined>()
  const [breaking, setBreaking] = useState<string | undefined>()
  const [additional, setAdditional] = useState<AdditionalProperties>()

  if (!type) {
    return <RequestCommitMessageType onSubmit={setType} />
  }

  if (!subject) {
    return <RequestCommitMessageSubject onSubmit={setSubject} />
  }

  if (!additional) {
    return <RequestCommitMessageAdditional onSubmit={setAdditional} />
  }

  if (additional.scope && !scope) {
    return <RequestCommitMessageScope onSubmit={setScope} />
  }

  if (additional.issues && !issues) {
    return <RequestCommitMessageIssues onSubmit={setIssues} />
  }

  if (additional.body && !body) {
    return <RequestCommitMessageBody onSubmit={setBody} />
  }

  if (additional.breaking && !breaking) {
    return <RequestCommitMessageBreaking onSubmit={setBreaking} />
  }

  return (
    <Submit
      type={type}
      scope={scope}
      subject={subject}
      issues={issues}
      body={body}
      breaking={breaking}
      skipci={additional.skipci}
      onSubmit={onSubmit}
    />
  )
}
