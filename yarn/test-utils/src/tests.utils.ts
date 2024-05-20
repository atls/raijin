import { createRequire }     from 'node:module'
import { delimiter }         from 'node:path'
import { join }              from 'node:path'
import { fileURLToPath }     from 'node:url'

import { WorkspaceResolver } from '@yarnpkg/core'
import { npath }             from '@yarnpkg/fslib'
import { tests }             from 'pkg-tests-core'
import { exec }              from 'pkg-tests-core'

import { packageUtils }      from './package.utils.js'

const { generatePkgDriver } = tests
const { execFile } = exec

const require = createRequire(import.meta.url)

const mte = generatePkgDriver({
  getName() {
    return `yarn`
  },
  async runDriver(path, [command, ...args], { cwd, projectFolder, registryUrl, env, ...config }) {
    const rcEnv: Record<string, any> = {}
    for (const [key, value] of Object.entries(config))
      rcEnv[`YARN_${key.replace(/([A-Z])/g, `_$1`).toUpperCase()}`] = Array.isArray(value)
        ? value.join(`;`)
        : value

    const nativePath = npath.fromPortablePath(path)
    const nativeHomePath = npath.dirname(nativePath)

    const cwdArgs = typeof projectFolder !== `undefined` ? [projectFolder] : []

    const yarnBinary = require.resolve(
      join(fileURLToPath(new URL('.', import.meta.url)), '../../cli/dist/yarn.cjs')
    )

    const res = await execFile(process.execPath, [yarnBinary, ...cwdArgs, command, ...args], {
      cwd: cwd || path,
      env: {
        [`HOME`]: nativeHomePath,
        [`USERPROFILE`]: nativeHomePath,
        [`PATH`]: `${nativePath}/bin${delimiter}${process.env.PATH}`,
        [`YARN_IS_TEST_ENV`]: `true`,
        [`YARN_GLOBAL_FOLDER`]: `${nativePath}/.yarn/global`,
        // [`YARN_NPM_REGISTRY_SERVER`]: registryUrl,
        // [`YARN_UNSAFE_HTTP_WHITELIST`]: new URL(registryUrl).hostname,
        [`YARN_PNP_ENABLE_ESM_LOADER`]: `1`,
        // Otherwise we'd send telemetry event when running tests
        [`YARN_ENABLE_TELEMETRY`]: `0`,
        // Otherwise snapshots relying on this would break each time it's bumped
        [`YARN_CACHE_VERSION_OVERRIDE`]: `0`,
        // Otherwise the output isn't stable between runs
        [`YARN_ENABLE_PROGRESS_BARS`]: `false`,
        [`YARN_ENABLE_TIMERS`]: `false`,
        [`FORCE_COLOR`]: `0`,
        // Otherwise the output wouldn't be the same on CI vs non-CI
        [`YARN_ENABLE_INLINE_BUILDS`]: `false`,
        // Otherwise we would more often test the fallback rather than the real logic
        [`YARN_PNP_FALLBACK_MODE`]: `none`,
        // Otherwise tests fail on systems where this is globally set to true
        [`YARN_ENABLE_GLOBAL_CACHE`]: `false`,
        // Older versions of Windows need this set to not have node throw an error
        [`NODE_SKIP_PLATFORM_CHECK`]: `1`,
        ...rcEnv,
        ...env,
      },
    })

    if (process.env.JEST_LOG_SPAWNS) {
      /* eslint-disable no-console */
      console.log(`===== stdout:`)
      console.log(res.stdout)
      console.log(`===== stderr:`)
      console.log(res.stderr)
      /* eslint-enable no-console */
    }

    return res
  },
})

export const makeTemporaryEnv = (
    packageJson: Record<string, any> | tests.RunFunction,
    subDefinition: Record<string, any> | tests.RunFunction,
    fn?: tests.RunFunction | undefined
  ) =>
  async (...args: Array<any>): Promise<Array<any>> => {
    const { dependencies } = (packageJson as Record<string, Record<string, string>>) || {}
    const { devDependencies } = (packageJson as Record<string, Record<string, string>>) || {}

    if (dependencies) {
      for await (const dep of Object.keys(dependencies)) {
        if (dependencies[dep].startsWith(WorkspaceResolver.protocol)) {
          dependencies[dep] = await packageUtils.pack(dep)
        }
      }
    }

    if (devDependencies) {
      for await (const dep of Object.keys(devDependencies)) {
        if (devDependencies[dep].startsWith(WorkspaceResolver.protocol)) {
          devDependencies[dep] = await packageUtils.pack(dep)
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    return mte(packageJson, subDefinition, fn)(...args)
  }
