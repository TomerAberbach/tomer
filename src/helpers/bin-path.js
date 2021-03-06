import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import resolve from 'resolve'

export default async function getBinPath(packageName) {
  const packageJsonPath = await new Promise(res =>
    resolve(
      `${packageName}/package.json`,
      { basedir: __dirname },
      (_, resolved) => res(resolved),
    ),
  )
  const { bin } = JSON.parse(await fs.readFile(packageJsonPath, `utf8`))
  return join(dirname(packageJsonPath), bin)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
