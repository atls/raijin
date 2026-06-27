import type { GetPrintersReturn } from '../interfaces/index.js'

import { printers }               from '../printers/index.js'

export const getPrinters = async (): GetPrintersReturn => printers
