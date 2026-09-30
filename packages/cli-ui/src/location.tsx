import type { Props as TerminalLinkProps } from 'ink-link'
import type { ComponentType }              from 'react'
import type { ReactElement }               from 'react'

import { isAbsolute }                      from 'node:path'
import { relative }                        from 'node:path'
import { resolve }                         from 'node:path'
import { fileURLToPath }                   from 'node:url'
import { pathToFileURL }                   from 'node:url'

import * as InkLink                        from 'ink-link'
import { Text }                            from 'ink'
import React                               from 'react'

const TerminalLink = InkLink.default as unknown as ComponentType<TerminalLinkProps>

interface SourceLocation {
  line?: number
  column?: number
}

interface FileLinkProps extends SourceLocation {
  target: string
  cwd?: string
}

interface FilePathProps extends SourceLocation {
  children: string
}

const toFilePath = (target: string): string => {
  if (isAbsolute(target)) {
    return target
  }

  try {
    const url = new URL(target)

    return url.protocol === 'file:' ? fileURLToPath(url) : url.pathname
  } catch {
    return target
  }
}

const toLinkUrl = (target: string, cwd: string): string => {
  if (isAbsolute(target)) {
    return pathToFileURL(target).href
  }

  try {
    return new URL(target).href
  } catch {
    return pathToFileURL(isAbsolute(target) ? target : resolve(cwd, target)).href
  }
}

const compactDependencyPath = (filePath: string): string => {
  const parts = filePath.split(/[\\/]/u)

  return parts.includes('node_modules') ? (parts.at(-1) ?? filePath) : filePath
}

const formatPosition = ({ line, column }: SourceLocation): string => {
  if (line === undefined) {
    return ''
  }

  return column === undefined ? `:${line}` : `:${line}:${column}`
}

export const FileLink = ({
  target,
  cwd = process.cwd(),
  line,
  column,
}: FileLinkProps): ReactElement => {
  const filePath = toFilePath(target)
  const displayPath = compactDependencyPath(
    isAbsolute(filePath) ? relative(cwd, filePath) : filePath
  )

  return (
    <TerminalLink url={toLinkUrl(target, cwd)}>
      <Text color='gray'>
        {displayPath}
        {formatPosition({ line, column })}
      </Text>
    </TerminalLink>
  )
}

export const FilePath = ({ children, line, column }: FilePathProps): ReactElement => (
  <Text color='cyan'>
    {children}
    <Text color='yellow'>{formatPosition({ line, column })}</Text>
  </Text>
)
