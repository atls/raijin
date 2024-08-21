import type { Project }          from '@yarnpkg/core'
import type { SpawnSyncReturns } from 'node:child_process'

import { spawnSync }             from 'node:child_process'
import { platform }              from 'node:os'

import { ppath }                 from '@yarnpkg/fslib'
import { xfs }                   from '@yarnpkg/fslib'

const husky = `#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug() {
    if [ "$HUSKY_DEBUG" = "1" ]; then
      echo "husky (debug) - $1"
    fi
  }

  readonly hook_name="$(basename -- "$0")"
  debug "starting $hook_name..."

  if [ "$HUSKY" = "0" ]; then
    debug "HUSKY env variable is set to 0, skipping hook"
    exit 0
  fi

  for file in "$XDG_CONFIG_HOME/husky/init.sh" "$HOME/.config/husky/init.sh" "$HOME/.huskyrc.sh"; do
    if [ -f "$file" ]; then
      debug "sourcing $file"
      . "$file"
      break
    fi
  done

  readonly husky_skip_init=1
  export husky_skip_init

  if [ "$(basename -- "$SHELL")" = "zsh" ]; then
    zsh --emulate sh -e "$0" "$@"
  else
    sh -e "$0" "$@"
  fi
  exitCode="$?"

  if [ $exitCode != 0 ]; then
    echo "husky - $hook_name hook exited with code $exitCode (error)"
  fi

  if [ $exitCode = 127 ]; then
    echo "husky - command not found in PATH=$PATH"
  fi

  exit $exitCode
fi
`

const hook = (command: string): string =>
  `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

${command}
`

const git = (args: Array<string>): SpawnSyncReturns<string> =>
  spawnSync('git', args, { encoding: 'utf-8' })

const hooksExists = (): boolean => {
  const { error, output } = git(['config', 'core.hooksPath'])

  if (error) {
    return false
  }

  return Boolean(output.at(1))
}

export const afterAllInstalled = async (project: Project): Promise<void> => {
  if (platform() === 'darwin') {
    const target = ppath.join(project.cwd, '.config/husky')

    if (!hooksExists()) {
      await xfs.mkdirPromise(ppath.join(target, '_'), { recursive: true })
      await xfs.writeFilePromise(ppath.join(target, '_/.gitignore'), '*')
      await xfs.writeFilePromise(ppath.join(target, '_/husky.sh'), husky)

      await xfs.writeFilePromise(
        ppath.join(target, 'commit-msg'),
        hook('yarn commit message lint'),
        { mode: 0o755 }
      )

      await xfs.writeFilePromise(ppath.join(target, 'pre-commit'), hook('yarn commit staged'), {
        mode: 0o755,
      })

      await xfs.writeFilePromise(
        ppath.join(target, 'prepare-commit-msg'),
        hook('yarn commit message $@'),
        { mode: 0o755 }
      )

      const { error } = git(['config', 'core.hooksPath', target])

      if (error) {
        throw error
      }
    }
  }
}
