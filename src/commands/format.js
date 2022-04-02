import { fromProjectDirectory, hasLocalFile } from '../helpers/local.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'
import resolveImport from '../helpers/resolve-import.js'
import { $, inherit } from '../helpers/command.js'

export const command = `format`

export const description = `Formats code using Prettier!`

export async function handler({ _: [, ...prettierArgs], '--': globs = [] }) {
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

async function getConfigArgs(prettierArgsSet) {
  if (
    prettierArgsSet.has(`--config`) ||
    prettierArgsSet.has(`--no-config`) ||
    (await hasLocalConfig(`prettier`))
  ) {
    return []
  }

  const configPath = await resolveImport(
    `@tomer/prettier-config`,
    import.meta.url,
  )
  return [`--config`, configPath]
}

async function getIgnorePathArgs(prettierArgsSet) {
  if (
    prettierArgsSet.has(`--ignore-path`) ||
    (await hasLocalFile(`.prettierignore`))
  ) {
    return []
  }

  return [
    `--ignore-path`,
    (await hasLocalFile(`.gitignore`))
      ? await fromProjectDirectory(`.gitignore`)
      : getConfigPath(`ignore`),
  ]
}

function getWriteArgs(prettierArgsSet) {
  if (
    prettierArgsSet.has(`--no-write`) ||
    prettierArgsSet.has(`-w`) ||
    prettierArgsSet.has(`--write`) ||
    prettierArgsSet.has(`--check`) ||
    prettierArgsSet.has(`-c`) ||
    prettierArgsSet.has(`--list-different`) ||
    prettierArgsSet.has(`-l`)
  ) {
    return []
  }

  return [`--write`]
}

function getIgnoreUnknownArgs(prettierArgsSet) {
  if (prettierArgsSet.has(`--ignore-unknown`) || prettierArgsSet.has(`-u`)) {
    return []
  }

  return [`--ignore-unknown`]
}
