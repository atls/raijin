import type { TestProjectInput } from '../../interfaces/input.js'

export type DiscoveryInput = Pick<TestProjectInput, 'cwd' | 'input' | 'rootCwd' | 'scenario'>
