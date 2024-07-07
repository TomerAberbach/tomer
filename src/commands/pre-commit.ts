import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'
import type { CommandModule } from './command-module.js'

export const command = `pre-commit`

export const description = `Validates code using lint-staged!`

export const handler: CommandModule[`handler`] = async ({
  _: [, ...lintStagedArgs],
}) => {
  const lintStagedArgsSet = new Set(lintStagedArgs)

  await inherit(
    $`lint-staged ${[
      ...(await getConfigArgs(lintStagedArgsSet)),
      ...getConcurrentArgs(lintStagedArgsSet),
      ...lintStagedArgs,
    ]}`,
  )
}

const getConfigArgs = async (
  lintStagedArgsSet: ReadonlySet<string>,
): Promise<string[]> =>
  lintStagedArgsSet.has(`--config`) ||
  lintStagedArgsSet.has(`-c`) ||
  (await hasLocalConfig(`lint-staged`))
    ? []
    : [`--config`, getConfigPath(`dist`, `lint-staged.js`)]

const getConcurrentArgs = (lintStagedArgsSet: ReadonlySet<string>): string[] =>
  lintStagedArgsSet.has(`--concurrent`) || lintStagedArgsSet.has(`-p`)
    ? []
    : [`--concurrent`, `false`]
