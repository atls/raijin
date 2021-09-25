import { run }                        from '@atls/buildpack-core'

import { YarnWorkspaceBuildBuilder }  from './yarn-workspace-build.builder'
import { YarnWorkspaceBuildDetector } from './yarn-workspace-build.detector'

run(new YarnWorkspaceBuildDetector(), new YarnWorkspaceBuildBuilder())

// @ts-ignore
const core = require('@atls/buildpack-core') // eslint-disable-line
