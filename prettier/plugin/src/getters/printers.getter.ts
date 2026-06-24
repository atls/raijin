import type { GetPrintersReturn } from '../interfaces/index.js'

import { printers }               from '../printers.js'

export const getPrinters = async (): GetPrintersReturn => printers
