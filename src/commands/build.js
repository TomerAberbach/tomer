import { $, inherit } from '../helpers/command.js'
import { getConfigPath } from '../helpers/config.js'

export const command = `build`

export const description = `Builds code using Rollup!`

export const handler = ({ _: [, ...rollupArgs] }) =>
  inherit($`rollup --config ${getConfigPath(`rollup.mjs`)} ${[...rollupArgs]}`)
