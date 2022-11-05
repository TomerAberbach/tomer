import { fromProjectDirectory } from '../helpers/local.js'
import { $, inherit } from '../helpers/command.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'
import resolveImport from '../helpers/resolve-import.js'

export const command = `lint`

export const description = `Lints code using ESLint!`

export const handler = async ({ _: [, ...eslintArgs], '--': globs = [] }) => {
  process.env.ESLINT_USE_FLAT_CONFIG = `true`

  const eslintArgsSet = new Set(eslintArgs)

  const [configArgs, cacheArgs, formatArgs] = await Promise.all([
    getConfigArgs(eslintArgsSet),
    getCacheArgs(eslintArgsSet),
    getFormatArgs(eslintArgsSet),
  ])

  await inherit(
    $`eslint ${[
      ...configArgs,
      ...cacheArgs,
      ...formatArgs,
      ...getFixArgs(eslintArgsSet),
      ...eslintArgs,
      ...(globs.length > 0 ? globs : [`.`]),
    ]}`,
  )
}

const getConfigArgs = async eslintArgsSet =>
  eslintArgsSet.has(`--config`) ||
  eslintArgsSet.has(`-c`) ||
  (!eslintArgsSet.has(`--no-config-lookup`) && (await hasLocalConfig(`eslint`)))
    ? []
    : [`--config`, getConfigPath(`eslint.mjs`)]

const getCacheArgs = async eslintArgsSet =>
  eslintArgsSet.has(`--no-cache`)
    ? []
    : [
        eslintArgsSet.has(`--cache`) && [`--cache`],
        eslintArgsSet.has(`--cache-location`) && [
          `--cache-location`,
          await fromProjectDirectory(`node_modules/.cache/.eslintcache`),
        ],
      ].filter(Boolean)

const getFormatArgs = async eslintArgsSet =>
  eslintArgsSet.has(`--format`)
    ? []
    : [
        `--format`,
        await resolveImport(`eslint-formatter-pretty`, import.meta.url),
      ]

export const getFixArgs = eslintArgsSet =>
  eslintArgsSet.has(`--no-fix`) ||
  eslintArgsSet.has(`--fix`) ||
  eslintArgsSet.has(`--fix-dry-run`)
    ? []
    : [`--fix`]
