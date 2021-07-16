import { join } from 'path'
import { promises as fs } from 'fs'
import execa from 'execa'
import mem from 'mem'

export const getProjectDirectory = mem(
  async () => (await execa.command(`git rev-parse --show-toplevel`)).stdout,
)

export const getPackageJson = mem(async () =>
  JSON.parse(
    await fs.readFile(
      join(await getProjectDirectory(), `package.json`),
      `utf8`,
    ),
  ),
)
