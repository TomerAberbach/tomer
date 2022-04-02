import { $, inherit } from '../helpers/command.js'

export const command = `clean`

export const description = `Deletes using rimraf!`

export async function handler({ _: [, ...rimrafArgs] }) {
  await inherit($`rimraf ${rimrafArgs}`)
}
