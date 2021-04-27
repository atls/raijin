import { getChangedCommmits } from './changed.commits'

export const getChangedFiles = async (): Promise<Array<string>> => {
  const commits = await getChangedCommmits()

  return commits
    .map((commit) => {
      if (!commit?.data?.files) {
        return []
      }

      return commit.data.files.map((file) => file.filename).filter(Boolean) as Array<string>
    })
    .flat()
}
