import { fromProjectDirectory, hasLocalFile } from '../helpers/local.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'
import resolveImport from '../helpers/resolve-import.js'
import { $, inherit } from '../helpers/command.js'

export const command = `format`

export const description = `Formats code using Prettier!`

export const handler = async ({ _: [, ...prettierArgs], '--': globs = [] }) => {
  const prettierArgsSet = new Set(prettierArgs)

  const [configArgs, ignorePathArgs] = await Promise.all([
    getConfigArgs(prettierArgsSet),
    getIgnorePathArgs(prettierArgsSet),
  ])

  await inherit(
    $`prettier ${[
      ...configArgs,
      ...ignorePathArgs,
      ...getWriteArgs(prettierArgsSet),
      ...getIgnoreUnknownArgs(prettierArgsSet),
      ...prettierArgs,
      ...(globs.length > 0 ? globs : [`.`]),
    ]}`,
  )
}

const getConfigArgs = async prettierArgsSet =>
  prettierArgsSet.has(`--config`) ||
  prettierArgsSet.has(`--no-config`) ||
  (await hasLocalConfig(`prettier`))
    ? []
    : [`--config`, resolveImport(`@tomer/prettier-config`, import.meta.url)]

const getIgnorePathArgs = async prettierArgsSet =>
  prettierArgsSet.has(`--ignore-path`) ||
  (await hasLocalFile(`.prettierignore`))
    ? []
    : [
        `--ignore-path`,
        (await hasLocalFile(`.gitignore`))
          ? await fromProjectDirectory(`.gitignore`)
          : getConfigPath(`ignore`),
      ]

const getWriteArgs = prettierArgsSet =>
  prettierArgsSet.has(`--no-write`) ||
  prettierArgsSet.has(`-w`) ||
  prettierArgsSet.has(`--write`) ||
  prettierArgsSet.has(`--check`) ||
  prettierArgsSet.has(`-c`) ||
  prettierArgsSet.has(`--list-different`) ||
  prettierArgsSet.has(`-l`)
    ? []
    : [`--write`]

const getIgnoreUnknownArgs = prettierArgsSet =>
  prettierArgsSet.has(`--ignore-unknown`) || prettierArgsSet.has(`-u`)
    ? []
    : [`--ignore-unknown`]
