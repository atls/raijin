import { ReactNode }  from 'react'
import { createNode } from 'ink/build/dom'
import reconciler     from 'ink/build/reconciler'
import render         from 'ink/build/renderer'

export const renderStatic = (
  target: ReactNode,
  terminalWidth: number = process.stdout.columns || 80
) => {
  const rootNode = createNode('ink-root')

  const container = reconciler.createContainer(rootNode, false, false)

  reconciler.updateContainer(target, container, null)

  const { output } = render(rootNode, terminalWidth)

  return output
}
