import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'
import { fromProjectDirectory } from '../helpers/local.js'
import resolveImport from '../helpers/resolve-import.js'
import type { CommandModule } from './command-module.js'

export const command = `lint`

export const description = `Lints code using ESLint!`

export const handler: CommandModule[`handler`] = async ({
  _: [, ...eslintArgs],
  '--': globs = [],
}) => {
  process.env.ESLINT_USE_FLAT_CONFIG = `true`

  const eslintArgsSet = new Set(eslintArgs)

  const [configArgs, cacheArgs] = await Promise.all([
    getConfigArgs(eslintArgsSet),
    getCacheArgs(eslintArgsSet),
  ])

  await inherit(
    $`eslint ${[
      ...configArgs,
      ...cacheArgs,
      ...getFormatArgs(eslintArgsSet),
      ...getFixArgs(eslintArgsSet),
      ...eslintArgs,
      ...(globs.length > 0 ? globs : [`.`]),
    ]}`,
  )
}

const getConfigArgs = async (
  eslintArgsSet: ReadonlySet<string>,
): Promise<string[]> =>
  eslintArgsSet.has(`--config`) ||
  eslintArgsSet.has(`-c`) ||
  (!eslintArgsSet.has(`--no-config-lookup`) && (await hasLocalConfig(`eslint`)))
    ? []
    : [`--config`, getConfigPath(`eslint.js`)]

const getCacheArgs = async (
  eslintArgsSet: ReadonlySet<string>,
): Promise<string[]> =>
  eslintArgsSet.has(`--no-cache`)
    ? []
    : [
        eslintArgsSet.has(`--cache`) && [`--cache`],
        eslintArgsSet.has(`--cache-location`) && [
          `--cache-location`,
          await fromProjectDirectory(`node_modules/.cache/.eslintcache`),
        ],
      ]
        .flat()
        .filter(arg => typeof arg === `string`)

const getFormatArgs = (eslintArgsSet: ReadonlySet<string>): string[] =>
  eslintArgsSet.has(`--format`)
    ? []
    : [`--format`, resolveImport(`eslint-formatter-pretty`, import.meta.url)]

export const getFixArgs = (eslintArgsSet: ReadonlySet<string>): string[] =>
  eslintArgsSet.has(`--no-fix`) ||
  eslintArgsSet.has(`--fix`) ||
  eslintArgsSet.has(`--fix-dry-run`)
    ? []
    : [`--fix`]
