import { join } from 'path'
import execa from 'execa'
import pathExists from 'path-exists'
import { getProjectDirectory } from '../project.js'

export const command = `test`

export const description = `Runs tests`

export const builder = yargs =>
  yargs.option(`coverage`, {
    alias: `c`,
    type: `boolean`,
    default: false,
    description: `run with coverage`,
  })

const run = async command => {
  const child = execa.command(command, { preferLocal: true })
  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)

  try {
    await child
  } catch (e) {
    process.exit(e.exitCode)
  }
}

export const handler = async ({ coverage }) => {
  await run(`${coverage ? `c8 ava` : `ava`} -T 1m`)

  if (await pathExists(join(await getProjectDirectory(), `test-d`))) {
    await run(`tsd`)
  }
}
