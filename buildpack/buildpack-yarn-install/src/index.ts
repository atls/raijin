import { run }                 from '@atls/buildpack-core'

import { YarnInstallBuilder }  from './yarn-install.builder'
import { YarnInstallDetector } from './yarn-install.detector'

run(new YarnInstallDetector(), new YarnInstallBuilder())

// @ts-ignore
const core = require('@atls/buildpack-core') // eslint-disable-line
