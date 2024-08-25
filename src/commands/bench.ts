import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'
import type { CommandModule } from './command-module.js'

export const command = `bench`

export const description = `Benchmarks code using Vitest!`

export const handler: CommandModule[`handler`] = async ({
  _: [, ...vitestArgs],
}) => {
  const vitestArgsSet = new Set(vitestArgs)

  await inherit(
    $`vitest bench  ${await getConfigArgs(vitestArgsSet)} ${vitestArgs}`,
  )
}

const getConfigArgs = async (
  vitestArgsSet: ReadonlySet<string>,
): Promise<string[]> =>
  vitestArgsSet.has(`--config`) ||
  vitestArgsSet.has(`-c`) ||
  (await hasLocalConfig(`vitest`))
    ? []
    : [`--config`, getConfigPath(`vitest.js`)]
