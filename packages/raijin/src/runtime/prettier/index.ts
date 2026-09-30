import type { Config }            from 'prettier'

import { createPrettierDefaults } from '../../config/prettier/index.js'

export const prettierconfig: Config = await createPrettierDefaults()

export default prettierconfig
