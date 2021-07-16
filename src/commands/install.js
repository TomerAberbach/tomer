import { join } from 'path'
import execa from 'execa'
import huskyConfig from '../configs/husky.js'

const getGitHooksDirectory = async () => {
  const projectDirectory = (
    await execa.command(`git rev-parse --show-toplevel`)
  ).stdout
  return join(projectDirectory, `.git/hooks`)
}

const husky = (...args) => execa(`husky`, args, { preferLocal: true })

export const command = `install`

export const description = `Installs git hooks`

export const handler = async () => {
  const gitHooksDirectory = await getGitHooksDirectory()

  await husky(`install`, gitHooksDirectory)
  await Promise.all(
    Object.entries(huskyConfig).map(([hook, script]) =>
      husky(`add`, join(gitHooksDirectory, hook), script),
    ),
  )
}
