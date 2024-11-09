/* eslint-disable jsx-a11y/anchor-is-valid */

import type { ReactElement } from 'react'

import { basename }          from 'node:path'
import { isAbsolute }        from 'node:path'
import { relative }          from 'node:path'

import { Text }              from 'ink'
import { useMemo }           from 'react'
import Link                  from 'ink-link'
import React                 from 'react'

export interface FileLinkProps {
  url: string
  cwd?: string
  column?: number
  line?: number
}

export const FileLink = ({
  url,
  cwd = process.cwd(),
  column = 0,
  line = 0,
}: FileLinkProps): ReactElement => {
  const filePath = useMemo(() => {
    try {
      return new URL(url).pathname
    } catch {
      return url
    }
  }, [url])

  const relativePath = useMemo(() => {
    if (isAbsolute(filePath)) {
      return relative(cwd, filePath)
    }

    return filePath
  }, [filePath])

  const finalFilePath = useMemo(() => {
    if (relativePath.includes('/node_modules/')) {
      return basename(relativePath)
    }

    return relativePath
  }, [relativePath])

  return (
    <Link url={url}>
      <Text color='gray'>
        {finalFilePath}:{line}:{column}
      </Text>
    </Link>
  )
}
