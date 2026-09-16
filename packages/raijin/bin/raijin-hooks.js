#!/usr/bin/env node

import { installRepositoryHooks } from './hooks.js'

await installRepositoryHooks(process.cwd())
