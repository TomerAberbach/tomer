import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'

export const command = `commit-msg`

export const description = `Validates commit messages using commitlint!`

export const handler = async ({ _: [, ...commitlintArgs] }) => {
  const commitlintArgsSet = new Set(commitlintArgs)

  await inherit(
    $`commitlint ${[
      ...(await getConfigArgs(commitlintArgsSet)),
      ...commitlintArgs,
    ]}`,
  )
}

const getConfigArgs = async commitlintArgsSet =>
  commitlintArgsSet.has(`--config`) ||
  commitlintArgsSet.has(`-c`) ||
  (await hasLocalConfig(`commitlint`))
    ? []
    : [`--config`, getConfigPath(`commitlint.json`)]
