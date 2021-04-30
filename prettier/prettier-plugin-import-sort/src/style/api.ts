/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
import globby from 'globby'
import path   from 'path'

const loadWorkspaces = () => {
  const exists = new Set()

  try {
    const { workspaces } = require(path.join(process.cwd(), '/package.json'))

    if (workspaces && workspaces.length > 0) {
      const folders = globby.sync(workspaces, {
        cwd: process.cwd(),
        onlyDirectories: true,
        absolute: true,
        expandDirectories: false,
      })

      folders.forEach((folder) => {
        try {
          const { name } = require(path.join(folder, 'package.json'))

          if (name.startsWith('@')) {
            exists.add(name)
          }
        } catch (error) {} // eslint-disable-line
      })
    }
  } catch (error) {
    console.log(error) // eslint-disable-line
  }

  return exists
}

const workspaces = loadWorkspaces()

export const isWorkspaceModule = (imported: any) => workspaces.has(imported.moduleName)
