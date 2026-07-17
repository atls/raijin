import type { Readable }                          from 'node:stream'
import type { Writable }                          from 'node:stream'

import type { ScaffoldType } from '../commands/generate/project/scaffold.interfaces.js'

import { createInterface }                        from 'node:readline'

import { SCAFFOLD_TYPES }                         from '../commands/generate/project/scaffold.js'
import { RaijinInitializerScaffoldTypeRequiredException } from './exceptions/scaffold-type-required.js'
import { RaijinInitializerScaffoldTypeException } from './exceptions/scaffold-type.js'
import { RaijinInitializerUsageException }        from './exceptions/usage.js'
import { isScaffoldType }                         from '../commands/generate/project/scaffold.js'

export const RAIJIN_SCAFFOLD_TYPES = SCAFFOLD_TYPES

export type RaijinScaffoldType = ScaffoldType

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

const readScaffoldTypeAnswer = async (input: TtyReadable, output: TtyWritable): Promise<string> =>
  new Promise((resolve, reject) => {
    const readline = createInterface({ input, output })
    let settled = false

    const settle = (callback: () => void): void => {
      if (settled) {
        return
      }

      settled = true
      callback()
      readline.close()
    }

    readline.once('close', () => {
      if (!settled) {
        settled = true
        reject(new RaijinInitializerScaffoldTypeRequiredException())
      }
    })

    readline.once('SIGINT', () => {
      settle(() => {
        reject(new RaijinInitializerScaffoldTypeRequiredException())
      })
    })

    readline.question(SCAFFOLD_TYPE_PROMPT, (answer) => {
      settle(() => {
        resolve(answer)
      })
    })
  })

export const parseRaijinScaffoldType = (value: string): RaijinScaffoldType => {
  if (isScaffoldType(value)) {
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

  const answer = await readScaffoldTypeAnswer(input, output)
  const scaffoldType = SCAFFOLD_TYPE_OPTIONS.get(answer.trim())

  if (scaffoldType) {
    return scaffoldType
  }

  return parseRaijinScaffoldType(answer.trim())
}
