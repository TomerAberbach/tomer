import { $, inherit } from '../helpers/command.js'

export const command = `clean`

export const description = `Deletes using rimraf!`

export const handler = ({ _: [, ...rimrafArgs] }) =>
  inherit($`rimraf ${rimrafArgs}`)
