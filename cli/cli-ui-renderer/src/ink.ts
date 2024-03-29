import rec from 'ink/build/reconciler.js'
import ren from 'ink/build/renderer.js'

export { createNode } from 'ink/build/dom.js'

export const reconciler = rec.default || rec

export const render = (ren as any).default || ren
