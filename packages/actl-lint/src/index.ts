#!/usr/bin/env node

import { Cli } from 'clipanion'

import { LintCommand } from './commands/lint'

const [...args] = process.argv

const cli = new Cli({
  binaryLabel: `Any`,
  binaryName: `anyco`,
  binaryVersion: `1.0.0`,
})

cli.register(LintCommand)
cli.runExit(args, Cli.defaultContext)
