import { ReactNode }          from 'react'

import { Output }             from './ink.js'
import { reconciler }         from './ink.js'
import { createNode }         from './ink.js'
import { renderNodeToOutput } from './ink.js'

export const renderStatic = (
  target: ReactNode,
  terminalWidth: number = process.stdout.columns || 80
) => {
  const rootNode = createNode('ink-root')
  const container = reconciler.createContainer(rootNode, false, false)

  reconciler.updateContainer(target, container, null)

  rootNode.yogaNode!.setWidth(terminalWidth)
  rootNode.yogaNode!.calculateLayout(undefined, undefined, 1)

  const output = new Output({
    width: rootNode.yogaNode!.getComputedWidth(),
    height: rootNode.yogaNode!.getComputedHeight(),
  })

  renderNodeToOutput(rootNode, output, { skipStaticElements: false })

  return output.get().output
}
