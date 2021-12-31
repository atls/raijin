import React                              from 'react'
import { FC }                             from 'react'
import { useEffect }                      from 'react'
import { useState }                       from 'react'

import { RequestCommitMessageAdditional } from './request-commit-message-additional.component'
import { AdditionalProperties }           from './request-commit-message-additional.component'
import { RequestCommitMessageBody }       from './request-commit-message-body.component'
import { RequestCommitMessageBreaking }   from './request-commit-message-breaking.component'
import { RequestCommitMessageIssues }     from './request-commit-message-issues.component'
import { RequestCommitMessageScope }      from './request-commit-message-scope.component'
import { RequestCommitMessageSubject }    from './request-commit-message-subject.component'
import { RequestCommitMessageType }       from './request-commit-message-type.component'

const Submit = ({ onSubmit, ...props }) => {
  useEffect(() => {
    onSubmit(props)
  }, [props, onSubmit])

  return null
}

export interface CommitProperties {
  type: string
  subject: string
  scope?: string
  body?: string
  breaking?: string
  issues?: string
  skipci?: boolean
}

interface RequestCommitMessageProps {
  onSubmit: (props: CommitProperties) => void
}

export const RequestCommitMessage: FC<RequestCommitMessageProps> = ({ onSubmit }) => {
  const [type, setType] = useState()
  const [scope, setScope] = useState()
  const [subject, setSubject] = useState()
  const [issues, setIssues] = useState()
  const [body, setBody] = useState()
  const [breaking, setBreaking] = useState()
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

  if (additional?.scope && !scope) {
    return <RequestCommitMessageScope onSubmit={setScope} />
  }

  if (additional?.issues && !issues) {
    return <RequestCommitMessageIssues onSubmit={setIssues} />
  }

  if (additional?.body && !body) {
    return <RequestCommitMessageBody onSubmit={setBody} />
  }

  if (additional?.breaking && !breaking) {
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
      skipci={additional?.skipci}
      onSubmit={onSubmit}
    />
  )
}
