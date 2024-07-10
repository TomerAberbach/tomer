import fs from 'node:fs/promises'
import pMemoize from 'p-memoize'
import type { PackageJson } from 'type-fest'
import etz from 'etz'
import { fromProjectDirectory } from './local.js'
import { stringify } from './json.js'

export const getPackageJsonScripts = async (): Promise<
  NonNullable<PackageJson[`scripts`]>
> => {
  const { scripts = {} } = await getPackageJson()
  return scripts
}

export const hasAnyDependency = async (
  dependency: string,
): Promise<boolean> => {
  const packageJson = await getPackageJson()
  return DEPENDENCY_KEYS.some(key => {
    const object = packageJson[key]
    return object?.[dependency]
  })
}

const DEPENDENCY_KEYS = [
  `dependencies`,
  `devDependencies`,
  `peerDependencies`,
  `optionalDependencies`,
] as const

export const getPackageJson = pMemoize(async (): Promise<PackageJson> => {
  const packageJson = JSON.parse(
    await fs.readFile(await getPackageJsonPath(), `utf8`),
  ) as PackageJson
  if (packageJson.type !== `module`) {
    etz.error(`Cannot process CJS packages`)
    process.exit(1)
  }
  return packageJson
})

export const getPackageJsonPath = pMemoize(async (): Promise<string> => {
  const packageJsonPath = await fromProjectDirectory(`package.json`)
  etz.debug(`package.json path: ${stringify(packageJsonPath)}`)
  return packageJsonPath
})
