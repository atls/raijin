#!/usr/bin/env node

import { Cli } from "clipanion";

import * as commands from "./commands/commands";

const [node, app, ...args] = process.argv;

const cli = new Cli({
  binaryLabel: `Atlantis Controls Temporal Logic`,
  binaryName: `${node} ${app}`,
  binaryVersion: require("../package.json").version,
});

Object.keys(commands).forEach((command) => cli.register(commands[command]));
cli.runExit(args, Cli.defaultContext);
