import { ReactNode }         from 'react'

import { reconciler } from './ink.js'
import { render }     from './ink.js'
import { createNode } from './ink.js'

export const renderStatic = (
  target: ReactNode,
  terminalWidth: number = process.stdout.columns || 80,
) => {
  const rootNode = createNode('ink-root')

  const container = reconciler.createContainer(rootNode, false, false)

  reconciler.updateContainer(target, container, null)

  const { output } = render(
    rootNode,
    terminalWidth,
  )

  return output
}
