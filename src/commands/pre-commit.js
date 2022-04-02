import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'

export const command = `pre-commit`

export const description = `Validates code using lint-staged!`

export async function handler({ _: [, ...lintStagedArgs] }) {
  const lintStagedArgsSet = new Set(lintStagedArgs)

  await inherit(
    $`lint-staged ${[
      ...(await getConfigArgs(lintStagedArgsSet)),
      ...getConcurrentArgs(lintStagedArgsSet),
      ...lintStagedArgs,
    ]}`,
  )
}

async function getConfigArgs(lintStagedArgsSet) {
  if (
    lintStagedArgsSet.has(`--config`) ||
    lintStagedArgsSet.has(`-c`) ||
    (await hasLocalConfig(`lint-staged`))
  ) {
    return []
  }

  return [`--config`, getConfigPath(`lint-staged.mjs`)]
}

function getConcurrentArgs(lintStagedArgsSet) {
  if (lintStagedArgsSet.has(`--concurrent`) || lintStagedArgsSet.has(`-p`)) {
    return []
  }

  return [`--concurrent`, `false`]
}
