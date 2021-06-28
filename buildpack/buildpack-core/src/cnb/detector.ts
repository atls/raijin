import { DetectContext } from './detect.context'

export type DetectResult = any

export interface Detector {
  detect(context: DetectContext): Promise<DetectResult>
}
