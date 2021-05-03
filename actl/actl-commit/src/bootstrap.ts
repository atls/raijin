import path                               from 'path'
import inquirer                           from 'inquirer'
import { gitCz as gitCzParser }           from 'commitizen/dist/cli/parsers'
import { commitizen as commitizenParser } from 'commitizen/dist/cli/parsers'
import { commit, staging, adapter }       from 'commitizen/dist/commitizen'
import * as gitStrategy                   from 'commitizen/dist/cli/strategies'

const gitCz = async (rawGitArgs, environment, adapterConfig) => {
  const parsedCommitizenArgs = commitizenParser.parse(rawGitArgs)

  if (parsedCommitizenArgs.amend) {
    gitStrategy.default(rawGitArgs, environment)

    return
  }

  const parsedGitCzArgs = gitCzParser.parse(rawGitArgs)

  const retryLastCommit = rawGitArgs && rawGitArgs[0] === '--retry'

  const hookMode = !(typeof parsedCommitizenArgs.hook === 'undefined')

  const prompter = adapter.getPrompter(adapterConfig.path)

  const stagingIsClean = await new Promise((resolve, reject) => {
    staging.isClean(process.cwd(), (error, value) => {
      if (error) {
        reject(error)
      } else {
        resolve(value)
      }
    })
  })

  if (stagingIsClean && !parsedGitCzArgs.includes('--allow-empty')) {
    throw new Error('No files added to staging! Did you forget to run git add?')
  }

  await new Promise((resolve, reject) => {
    commit(
      inquirer,
      adapter.getGitRootPath(),
      prompter,
      {
        args: parsedGitCzArgs,
        disableAppendPaths: true,
        emitData: true,
        quiet: false,
        retryLastCommit,
        hookMode,
      },
      (error) => {
        if (error) {
          reject(error)
        } else {
          resolve(null)
        }
      }
    )
  })
}

const bootstrap = async (argv = process.argv) => {
  const rawGitArgs = argv.slice(1, argv.length)

  const environment = {
    cliPath: require.resolve('commitizen/package.json').replace('package.json', ''),
    config: {
      path: path.join(__dirname, '../adapter/index.js'),
    },
  }

  await gitCz(rawGitArgs, environment, environment.config)
}

export { bootstrap }
