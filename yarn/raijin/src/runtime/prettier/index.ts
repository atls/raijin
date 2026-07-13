import type { Config }          from 'prettier'

import { createPrettierConfig } from './config.js'

export const prettierconfig: Config = await createPrettierConfig()

export default prettierconfig
