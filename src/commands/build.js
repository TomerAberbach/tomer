import { $, inherit } from '../helpers/command.js'
import { getConfigPath } from '../helpers/config.js'

export const command = `build`

export const description = `Builds code using Rollup!`

export async function handler({ _: [, ...rollupArgs] }) {
  await inherit(
    $`rollup --config ${getConfigPath(`rollup.mjs`)} ${[...rollupArgs]}`,
  )
}
