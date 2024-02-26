/* Copy/Paste https://github.com/yarnpkg/berry/blob/master/packages/acceptance-tests/pkg-tests-core/sources/utils/tests.ts */
/* eslint-disable */

import * as fsUtils     from './fs.js'

import { PortablePath } from '@yarnpkg/fslib'
import { npath }        from '@yarnpkg/fslib'

import { ExecResult }   from './exec.js'

const deepResolve = require(`super-resolve`)

interface RunDriverOptions extends Record<string, any> {
  cwd?: PortablePath
  projectFolder?: PortablePath
  env?: Record<string, string>
}

export type PackageRunDriver = (
  path: PortablePath,
  args: Array<string>,
  opts: RunDriverOptions
) => Promise<ExecResult>

export interface PackageDriver {
  (
    packageJson: Record<string, any>,
    subDefinition: Record<string, any> | RunFunction,
    fn?: RunFunction
  ): any
  getPackageManagerName: () => string
  withConfig: (definition: Record<string, any>) => PackageDriver
}

export type RunFunction = ({
  path,
  run,
  source,
}: {
  path: PortablePath
  run: (
    ...args: Array<string> | [...Array<string>, Partial<RunDriverOptions>]
  ) => Promise<ExecResult>
  source: (script: string, callDefinition?: Record<string, any>) => Promise<Record<string, any>>
}) => void

export const generatePkgDriver = ({
  getName,
  runDriver,
}: {
  getName: () => string
  runDriver: PackageRunDriver
}): PackageDriver => {
  const withConfig = (definition: Record<string, any>): PackageDriver => {
    const makeTemporaryEnv: PackageDriver = (packageJson, subDefinition, fn) => {
      if (typeof subDefinition === `function`) {
        fn = subDefinition as RunFunction
        subDefinition = {}
      }

      if (typeof fn !== `function`) {
        throw new Error(
          `Invalid test function (got ${typeof fn}) - you probably put the closing parenthesis of the "makeTemporaryEnv" utility at the wrong place`
        )
      }

      return Object.assign(async (): Promise<void> => {
        const path = await fsUtils.realpath(await fsUtils.createTemporaryFolder())

        // Writes a new package.json file into our temporary directory
        await fsUtils.writeJson(
          npath.toPortablePath(`${path}/package.json`),
          await deepResolve(packageJson)
        )

        const run = (...args: Array<any>) => {
          let callDefinition = {}

          if (args.length > 0 && typeof args[args.length - 1] === `object`)
            callDefinition = args.pop()

          return runDriver(path, args, {
            ...definition,
            ...subDefinition,
            ...callDefinition,
          })
        }

        const source = async (
          script: string,
          callDefinition: Record<string, any> = {}
        ): Promise<Record<string, any>> => {
          const scriptWrapper = `
              Promise.resolve().then(async () => ${script}).then(result => {
                return {type: 'success', result};
              }, err => {
                if (!(err instanceof Error))
                  return err;
                const copy = {message: err.message};
                if (err.code)
                  copy.code = err.code;
                if (err.pnpCode)
                  copy.pnpCode = err.pnpCode;
                return {type: 'failure', result: copy};
              }).then(payload => {
                console.log(JSON.stringify(payload));
              })
            `.replace(/\n/g, ``)

          const result = await run(`node`, `-e`, scriptWrapper, callDefinition)
          const content = result.stdout.toString()

          let data
          try {
            data = JSON.parse(content)
          } catch {
            throw new Error(`Error when parsing JSON payload (${content})`)
          }

          if (data.type === `failure`) {
            throw { externalException: data.result }
          } else {
            return data.result
          }
        }

        try {
          await fn!({ path, run, source })
        } catch (error) {
          ;(error as any).message = `Temporary fixture folder: ${npath.fromPortablePath(path)}\n\n${
            (error as any).message
          }`
          throw error
        }
      })
    }

    makeTemporaryEnv.getPackageManagerName = () => {
      return getName()
    }

    makeTemporaryEnv.withConfig = (subDefinition: Record<string, any>) => {
      return withConfig({ ...definition, ...subDefinition })
    }

    return makeTemporaryEnv
  }

  return withConfig({})
}
