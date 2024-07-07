import fs from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import resolve from 'resolve'
import type { PackageJson } from 'type-fest'

const getBinPath = async (packageName: string): Promise<string> => {
  const packageJsonPath = await new Promise<string>(res =>
    resolve(
      `${packageName}/package.json`,
      { basedir: __dirname },
      (_, resolved) => res(resolved!),
    ),
  )
  const { bin } = JSON.parse(
    await fs.readFile(packageJsonPath, `utf8`),
  ) as PackageJson
  return join(dirname(packageJsonPath), bin as string)
}

const __dirname = dirname(fileURLToPath(import.meta.url))

export default getBinPath
