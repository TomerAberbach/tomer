import etz from 'etz'
import { $, inherit } from '../helpers/command.js'
import { hasLocalFile } from '../helpers/local.js'

export const command = `typecheck`

export const description = `Typechecks code using TypeScript!`

export async function handler({ _: [, ...tscArgs] }) {
  const tscArgsSet = new Set(tscArgs)

  const hasProjectOrBuild =
    tscArgsSet.has(`--project`) ||
    tscArgsSet.has(`-p`) ||
    tscArgsSet.has(`--build`) ||
    tscArgsSet.has(`-b`)

  if (!hasProjectOrBuild && !(await hasLocalFile(`tsconfig.json`))) {
    etz.error(
      `Cannot typecheck without --project, -p, --build, -b, or a tsconfig.json`,
    )
    process.exit(1)
  }

  await inherit($`tsc ${hasProjectOrBuild ? [] : [`--build`]} ${tscArgs}`)
}
