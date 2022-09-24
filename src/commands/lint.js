import { fromProjectDirectory, hasLocalFile } from '../helpers/local.js'
import { $, inherit } from '../helpers/command.js'
import { hasPackageJsonProperty } from '../helpers/package-json.js'
import { getConfigPath, hasLocalConfig } from '../helpers/config.js'
import resolveImport from '../helpers/resolve-import.js'

export const command = `lint`

export const description = `Lints code using ESLint!`

export async function handler({ _: [, ...eslintArgs], '--': globs = [] }) {
  const eslintArgsSet = new Set(eslintArgs)

  const [configArgs, ignorePathArgs, cacheArgs, formatArgs] = await Promise.all(
    [
      getConfigArgs(eslintArgsSet),
      getIgnorePathArgs(eslintArgsSet),
      getCacheArgs(eslintArgsSet),
      getFormatArgs(eslintArgsSet),
    ],
  )

  await inherit(
    $`eslint ${[
      ...configArgs,
      ...ignorePathArgs,
      ...cacheArgs,
      ...formatArgs,
      ...getFixArgs(eslintArgsSet),
      ...eslintArgs,
      ...(globs.length > 0 ? globs : [`.`]),
    ]}`,
  )
}

async function getConfigArgs(eslintArgsSet) {
  if (
    eslintArgsSet.has(`--config`) ||
    eslintArgsSet.has(`-c`) ||
    (!eslintArgsSet.has(`--no-config-lookup`) &&
      (await hasLocalConfig(`eslint`)))
  ) {
    return []
  }

  const configPath = await resolveImport(
    `@tomer/eslint-config`,
    import.meta.url,
  )
  return [`--config`, configPath]
}

async function getIgnorePathArgs(eslintArgsSet) {
  if (
    eslintArgsSet.has(`--no-ignore`) ||
    eslintArgsSet.has(`--ignore-path`) ||
    (await hasPackageJsonProperty(`eslintIgnore`)) ||
    (await hasLocalFile(`.eslintignore`))
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

async function getCacheArgs(eslintArgsSet) {
  if (eslintArgsSet.has(`--no-cache`)) {
    return []
  }

  return [
    eslintArgsSet.has(`--cache`) && [`--cache`],
    eslintArgsSet.has(`--cache-location`) && [
      `--cache-location`,
      await fromProjectDirectory(`node_modules/.cache/.eslintcache`),
    ],
  ].filter(Boolean)
}

async function getFormatArgs(eslintArgsSet) {
  return eslintArgsSet.has(`--format`)
    ? []
    : [
        `--format`,
        await resolveImport(`eslint-formatter-pretty`, import.meta.url),
      ]
}

function getFixArgs(eslintArgsSet) {
  if (
    eslintArgsSet.has(`--no-fix`) ||
    eslintArgsSet.has(`--fix`) ||
    eslintArgsSet.has(`--fix-dry-run`)
  ) {
    return []
  }

  return [`--fix`]
}
