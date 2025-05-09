import etz from 'etz'
import { $, inherit } from '../helpers/command.js'
import { globLocalFiles } from '../helpers/local.js'
import { stringify } from '../helpers/json.js'
import type { CommandModule } from './command-module.js'

export const command = `typecheck`

export const description = `Typechecks code using TypeScript!`

export const handler: CommandModule[`handler`] = async ({
  _: [, ...tscArgs],
}) => {
  const tscArgsSet = new Set(tscArgs)

  const hasProjectOrBuild =
    tscArgsSet.has(`--project`) ||
    tscArgsSet.has(`-p`) ||
    tscArgsSet.has(`--build`) ||
    tscArgsSet.has(`-b`)
  if (hasProjectOrBuild) {
    await inherit($`tsc ${tscArgs}`)
    return
  }

  const tsConfigPaths = await globLocalFiles(`**/tsconfig.json`)
  etz.debug(`tsconfig.json paths: ${stringify(tsConfigPaths)}`)
  if (tsConfigPaths.length === 0) {
    etz.error(
      `Cannot typecheck without --project, -p, --build, -b, or a tsconfig.json`,
    )
    process.exit(1)
  }

  await inherit(
    tsConfigPaths.map(tsConfigPath => $`tsc -p ${tsConfigPath} ${tscArgs}`),
  )
}
