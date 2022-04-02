import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'

export const command = `install`

export const description = `Installs git hooks using simple-git-hooks!`

export async function handler({ _: [, ...simpleGitHooksArgs] }) {
  const simpleGitHooksArgsSet = new Set(simpleGitHooksArgs)

  await inherit(
    $`simple-git-hooks ${[
      ...(await getConfigArgs(simpleGitHooksArgsSet)),
      ...simpleGitHooksArgs,
    ]}`,
  )
}

async function getConfigArgs(simpleGitHooksArgsSet) {
  if (
    simpleGitHooksArgsSet.size > 0 ||
    (await hasLocalConfig(`simple-git-hooks`))
  ) {
    return []
  }

  return [getConfigPath(`simple-git-hooks.json`)]
}
