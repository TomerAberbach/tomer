import isCI from 'is-ci'
import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'
import type { CommandModule } from './command-module.js'

export const command = `test`

export const description = `Runs tests using Vitest!`

export const handler: CommandModule[`handler`] = async ({
  _: [, ...vitestArgs],
}) => {
  process.env.NODE_ENV = `test`
  process.env.NODE_OPTIONS = `--experimental-vm-modules --no-warnings`

  const vitestArgsSet = new Set(vitestArgs)

  await inherit(
    $`vitest run ${getWatchArgs(vitestArgs, vitestArgsSet)} ${await getConfigArgs(vitestArgsSet)} ${vitestArgs}`,
  )
}

const getWatchArgs = (
  vitestArgs: readonly string[],
  vitestArgsSet: ReadonlySet<string>,
): string[] => {
  if (
    isCI ||
    vitestArgsSet.has(`--coverage`) ||
    vitestArgsSet.has(`--update`) ||
    vitestArgsSet.has(`-u`) ||
    vitestArgsSet.has(`--watch=false`)
  ) {
    return []
  }

  let watchIndex = vitestArgs.indexOf(`--watch`)
  if (watchIndex < 0) {
    watchIndex = vitestArgs.indexOf(`-w`)
  }
  const watch = watchIndex >= 0 ? vitestArgs[watchIndex + 1] !== `false` : true
  if (!watch) {
    return []
  }

  return [`--watch`]
}

const getConfigArgs = async (
  vitestArgsSet: ReadonlySet<string>,
): Promise<string[]> =>
  vitestArgsSet.has(`--config`) ||
  vitestArgsSet.has(`-c`) ||
  (await hasLocalConfig(`vitest`))
    ? []
    : [`--config`, getConfigPath(`vitest.js`)]
