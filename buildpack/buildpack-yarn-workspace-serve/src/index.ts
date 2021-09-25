import { run }                        from '@atls/buildpack-core'

import { YarnWorkspaceServeBuilder }  from './yarn-workspace-serve.builder'
import { YarnWorkspaceServeDetector } from './yarn-workspace-serve.detector'

run(new YarnWorkspaceServeDetector(), new YarnWorkspaceServeBuilder())

// @ts-ignore
const core = require('@atls/buildpack-core') // eslint-disable-line
