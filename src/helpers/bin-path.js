import fs from 'fs/promises'
import { dirname, join } from 'path'
import resolve from 'resolve'
import { fileURLToPath } from 'url'

const getBinPath = async packageName => {
  const packageJsonPath = await new Promise(res =>
    resolve(
      `${packageName}/package.json`,
      { basedir: __dirname },
      (_, resolved) => res(resolved),
    ),
  )
  const { bin } = JSON.parse(await fs.readFile(packageJsonPath))
  return join(dirname(packageJsonPath), bin)
}

const __dirname = dirname(fileURLToPath(import.meta.url))

export default getBinPath
