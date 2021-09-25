import { run }               from '@atls/buildpack-core'

import { NodeStartBuilder }  from './node-start.builder'
import { NodeStartDetector } from './node-start.detector'

run(new NodeStartDetector(), new NodeStartBuilder())

// @ts-ignore
const core = require('@atls/buildpack-core') // eslint-disable-line
