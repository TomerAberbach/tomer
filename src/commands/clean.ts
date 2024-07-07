import { $, inherit } from '../helpers/command.js'
import type { CommandModule } from './command-module.js'

export const command = `clean`

export const description = `Deletes using rimraf!`

export const handler: CommandModule[`handler`] = ({ _: [, ...rimrafArgs] }) =>
  inherit($`rimraf ${rimrafArgs}`)
