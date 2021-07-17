import { join } from 'path'
import { promises as fs } from 'fs'
import execa from 'execa'

const middleware = async argv => {
  const projectDirectoryPath = (
    await execa.command(`git rev-parse --show-toplevel`)
  ).stdout
  argv.projectDirectoryPath = projectDirectoryPath
  argv.packageJson = JSON.parse(
    await fs.readFile(join(projectDirectoryPath, `package.json`), `utf8`),
  )
}

export default middleware
