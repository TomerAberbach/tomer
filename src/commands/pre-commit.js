import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'

export const command = `pre-commit`

export const description = `Validates code using lint-staged!`

export const handler = async ({ _: [, ...lintStagedArgs] }) => {
  const lintStagedArgsSet = new Set(lintStagedArgs)

  await inherit(
    $`lint-staged ${[
      ...(await getConfigArgs(lintStagedArgsSet)),
      ...getConcurrentArgs(lintStagedArgsSet),
      ...lintStagedArgs,
    ]}`,
  )
}

const getConfigArgs = async lintStagedArgsSet =>
  lintStagedArgsSet.has(`--config`) ||
  lintStagedArgsSet.has(`-c`) ||
  (await hasLocalConfig(`lint-staged`))
    ? []
    : [`--config`, getConfigPath(`lint-staged.mjs`)]

const getConcurrentArgs = lintStagedArgsSet =>
  lintStagedArgsSet.has(`--concurrent`) || lintStagedArgsSet.has(`-p`)
    ? []
    : [`--concurrent`, `false`]
