import type { TestProjectInput } from '../interfaces/input.js'

export type Input = Pick<TestProjectInput, 'cwd' | 'input' | 'rootCwd' | 'scenario'>
