import { join } from 'path'
import pathExists from 'path-exists'
import { exec } from '../util.js'

export const command = `test`

export const description = `Runs tests`

export const builder = yargs =>
  yargs
    .option(`coverage`, {
      alias: `c`,
      type: `boolean`,
      default: false,
      description: `run with coverage`,
    })
    .option(`update-snapshots`, {
      alias: `u`,
      type: `boolean`,
      default: false,
      description: `update snapshots`,
    })

export const handler = async ({
  coverage,
  'update-snapshots': updateSnaphots,
  projectDirectoryPath,
}) => {
  await exec(
    `${coverage ? `c8 ava` : `ava`} -T 1m --color ${
      updateSnaphots ? `--update-snapshots` : ``
    }`,
  )

  if (await pathExists(join(projectDirectoryPath, `test-d`))) {
    await exec(`tsd`)
  }
}
