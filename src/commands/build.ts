import { $, inherit } from '../helpers/command.js'
import { getConfigPath } from '../helpers/config.js'
import type { CommandModule } from './command-module.js'

export const command = `build`

export const description = `Builds code using Rollup!`

export const handler: CommandModule[`handler`] = ({ _: [, ...rollupArgs] }) =>
  inherit($`rollup --config ${getConfigPath(`rollup.js`)} ${[...rollupArgs]}`)
