import type { Readable }                                  from 'node:stream'
import type { Writable }                                  from 'node:stream'

import { createInterface }                                from 'node:readline'

import { RaijinInitializerScaffoldTypeRequiredException } from './exceptions/scaffold-type-required.js'
import { RaijinInitializerScaffoldTypeException }         from './exceptions/scaffold-type.js'
import { RaijinInitializerUsageException }                from './exceptions/usage.js'

export const RAIJIN_SCAFFOLD_TYPES = ['project', 'library'] as const

export type RaijinScaffoldType = (typeof RAIJIN_SCAFFOLD_TYPES)[number]

export type RaijinScaffoldTypeSelector = () => Promise<RaijinScaffoldType>

type TtyReadable = Readable & {
  isTTY?: boolean
}

type TtyWritable = Writable & {
  isTTY?: boolean
}

export interface SelectRaijinScaffoldTypeOptions {
  input?: TtyReadable
  output?: TtyWritable
}

export interface RaijinInitializerArguments {
  scaffoldType?: RaijinScaffoldType
}

const TYPE_OPTION = '--type'
const TYPE_OPTION_PREFIX = `${TYPE_OPTION}=`
const TYPE_OPTION_ALIAS = '-t'
const SCAFFOLD_TYPE_OPTIONS = new Map<string, RaijinScaffoldType>([
  ['1', 'project'],
  ['2', 'library'],
  ['project', 'project'],
  ['library', 'library'],
])
const SCAFFOLD_TYPE_PROMPT = [
  'Select Raijin scaffold type:',
  '  1. project',
  '  2. library',
  'Enter scaffold type or number: ',
].join('\n')

const isRaijinScaffoldType = (value: string): value is RaijinScaffoldType =>
  (RAIJIN_SCAFFOLD_TYPES as ReadonlyArray<string>).includes(value)

export const parseRaijinScaffoldType = (value: string): RaijinScaffoldType => {
  if (isRaijinScaffoldType(value)) {
    return value
  }

  throw new RaijinInitializerScaffoldTypeException(value)
}

export const parseRaijinInitializerArguments = (
  argv: Array<string>
): RaijinInitializerArguments => {
  const args = [...argv]
  const command = args[0]

  if (command === 'init') {
    args.shift()
  } else if (command && !command.startsWith('-')) {
    throw new RaijinInitializerUsageException()
  }

  let scaffoldType: RaijinScaffoldType | undefined

  const setScaffoldType = (value: string): void => {
    if (scaffoldType) {
      throw new RaijinInitializerUsageException()
    }

    scaffoldType = parseRaijinScaffoldType(value)
  }

  while (args.length > 0) {
    const option = args.shift()

    if (!option) {
      continue
    }

    if (option === TYPE_OPTION || option === TYPE_OPTION_ALIAS) {
      const value = args.shift()

      if (!value) {
        throw new RaijinInitializerUsageException()
      }

      setScaffoldType(value)

      continue
    }

    if (option.startsWith(TYPE_OPTION_PREFIX)) {
      setScaffoldType(option.slice(TYPE_OPTION_PREFIX.length))

      continue
    }

    throw new RaijinInitializerUsageException()
  }

  return { scaffoldType }
}

export const selectRaijinScaffoldType = async ({
  input = process.stdin,
  output = process.stdout,
}: SelectRaijinScaffoldTypeOptions = {}): Promise<RaijinScaffoldType> => {
  if (!input.isTTY || !output.isTTY) {
    throw new RaijinInitializerScaffoldTypeRequiredException()
  }

  const readline = createInterface({ input, output })

  try {
    const answer = await new Promise<string>((resolve) => {
      readline.question(SCAFFOLD_TYPE_PROMPT, resolve)
    })
    const scaffoldType = SCAFFOLD_TYPE_OPTIONS.get(answer.trim())

    if (scaffoldType) {
      return scaffoldType
    }

    return parseRaijinScaffoldType(answer.trim())
  } finally {
    readline.close()
  }
}
