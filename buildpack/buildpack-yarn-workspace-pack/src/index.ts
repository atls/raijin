import { run }                       from '@atls/buildpack-core'

import { YarnWorkspacePackBuilder }  from './yarn-workspace-pack.builder'
import { YarnWorkspacePackDetector } from './yarn-workspace-pack.detector'

run(new YarnWorkspacePackDetector(), new YarnWorkspacePackBuilder())

// @ts-ignore
const core = require('@atls/buildpack-core') // eslint-disable-line
