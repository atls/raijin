#!/usr/bin/env node

import { installRepositoryHooks } from '../hooks/install.js'

await installRepositoryHooks(process.cwd())
