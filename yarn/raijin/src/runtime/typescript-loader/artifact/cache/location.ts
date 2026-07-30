import envPaths from 'env-paths'

const APPLICATION_NAME = 'raijin-typescript-loader'

export const getLocation = (): string => envPaths(APPLICATION_NAME).temp
