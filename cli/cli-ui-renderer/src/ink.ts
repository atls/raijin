import o    from 'ink/build/output.js'
import rec  from 'ink/build/reconciler.js'
import rnto from 'ink/build/render-node-to-output.js'

export { createNode } from 'ink/build/dom.js'

export const reconciler = rec.default || rec

export const renderNodeToOutput = (rnto as any).default || rnto

export const Output = (o as any).default || o
