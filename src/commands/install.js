import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'

export const command = `install`

export const description = `Installs git hooks using simple-git-hooks!`

export const handler = async ({ _: [, ...simpleGitHooksArgs] }) => {
  const simpleGitHooksArgsSet = new Set(simpleGitHooksArgs)

  await inherit(
    $`simple-git-hooks ${[
      ...(await getConfigArgs(simpleGitHooksArgsSet)),
      ...simpleGitHooksArgs,
    ]}`,
  )
}

const getConfigArgs = async simpleGitHooksArgsSet =>
  simpleGitHooksArgsSet.size > 0 || (await hasLocalConfig(`simple-git-hooks`))
    ? []
    : [getConfigPath(`simple-git-hooks.json`)]
