import { dirname } from 'path'
import { fileURLToPath } from 'url'
import execa from 'execa'

export const rootPath = dirname(dirname(fileURLToPath(import.meta.url)))

// eslint-disable-next-line consistent-return
export const exec = async (command, args) => {
  const options = { localDir: rootPath, preferLocal: true }
  const childProcess = args
    ? execa(command, args, options)
    : execa.command(command, options)

  childProcess.stdout.pipe(process.stdout)
  childProcess.stderr.pipe(process.stderr)

  try {
    return await childProcess
  } catch (e) {
    process.exit(e.exitCode)
  }
}
