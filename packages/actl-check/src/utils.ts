import { promises as fsp } from 'fs'

export const isReportExists = async (reportPath: string): Promise<boolean> => {
  try {
    await fsp.access(reportPath)
    return true
  } catch (error) {
    // eslint-disable-line
    return false
  }
}
