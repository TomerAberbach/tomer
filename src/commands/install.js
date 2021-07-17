import { join } from 'path'
import huskyConfig from '../configs/husky.js'
import { exec } from '../util.js'

const husky = (...args) => exec(`husky`, args)

export const command = `install`

export const description = `Installs git hooks`

export const handler = async ({ projectDirectoryPath }) => {
  const hooksDirectoryPath = join(projectDirectoryPath, `.git/hooks`)

  await husky(`install`, hooksDirectoryPath)
  await Promise.all(
    Object.entries(huskyConfig).map(([hook, script]) =>
      husky(`set`, join(hooksDirectoryPath, hook), script),
    ),
  )
}
