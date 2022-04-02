import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'

export const command = `commit-msg`

export const description = `Validates commit messages using commitlint!`

export async function handler({ _: [, ...commitlintArgs] }) {
  const commitlintArgsSet = new Set(commitlintArgs)

  await inherit(
    $`commitlint ${[
      ...(await getConfigArgs(commitlintArgsSet)),
      ...commitlintArgs,
    ]}`,
  )
}

async function getConfigArgs(commitlintArgsSet) {
  if (
    commitlintArgsSet.has(`--config`) ||
    commitlintArgsSet.has(`-c`) ||
    (await hasLocalConfig(`commitlint`))
  ) {
    return []
  }

  return [`--config`, getConfigPath(`commitlint.json`)]
}
