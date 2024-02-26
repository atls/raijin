// @ts-ignore
import reconciler     from 'ink/build/reconciler'
// @ts-ignore
import render         from 'ink/build/renderer'
import { ReactNode }  from 'react'
// @ts-ignore
import { createNode } from 'ink/build/dom'

export const renderStatic = (
  target: ReactNode,
  terminalWidth: number = process.stdout.columns || 80
) => {
  const rootNode = createNode('ink-root')

  const container = reconciler.createContainer(rootNode, false, false)

  reconciler.updateContainer(target, container, null)

  const { output } = render(rootNode!, terminalWidth)

  return output
}
