import fs from 'fs/promises'
import pMemoize from 'p-memoize'
import { fromProjectDirectory } from './local.js'

export async function hasAnyDependency(dependency) {
  const packageJson = await getPackageJson()
  return DEPENDENCY_KEYS.some(key => {
    const object = packageJson[key]
    return object && object[dependency]
  })
}

const DEPENDENCY_KEYS = [
  `dependencies`,
  `devDependencies`,
  `peerDependencies`,
  `optionalDependencies`,
]

export async function hasPackageJsonProperty(property) {
  return Boolean((await getPackageJson())[property])
}

export const getIsTypeModule = async () =>
  (await getPackageJson()).type === `module`

export const getPackageJson = pMemoize(async () =>
  JSON.parse(await fs.readFile(await getPackageJsonPath(), `utf8`)),
)

export function getPackageJsonPath() {
  return fromProjectDirectory(`package.json`)
}
