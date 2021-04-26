#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clipanion_1 = require("clipanion");
const lint_1 = require("./commands/lint");
const [...args] = process.argv;
const cli = new clipanion_1.Cli({
    binaryLabel: `Any`,
    binaryName: `anyco`,
    binaryVersion: `1.0.0`,
});
cli.register(lint_1.LintCommand);
cli.runExit(args, clipanion_1.Cli.defaultContext);
