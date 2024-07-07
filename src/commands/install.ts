import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'
import type { CommandModule } from './command-module.js'

export const command = `install`

export const description = `Installs git hooks using simple-git-hooks!`

export const handler: CommandModule[`handler`] = async ({
  _: [, ...simpleGitHooksArgs],
}) => {
  const simpleGitHooksArgsSet = new Set(simpleGitHooksArgs)

  await inherit(
    $`simple-git-hooks ${[
      ...(await getConfigArgs(simpleGitHooksArgsSet)),
      ...simpleGitHooksArgs,
    ]}`,
  )
}

const getConfigArgs = async (
  simpleGitHooksArgsSet: ReadonlySet<string>,
): Promise<string[]> =>
  simpleGitHooksArgsSet.size > 0 || (await hasLocalConfig(`simple-git-hooks`))
    ? []
    : [getConfigPath(`src`, `simple-git-hooks.json`)]
