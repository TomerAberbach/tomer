import fs from 'fs/promises'
import pMemoize from 'p-memoize'
import { fromProjectDirectory } from './local.js'

export const getIsTypeModule = async () =>
  (await getPackageJson()).type === `module`

export const getPackageJsonScripts = async () => {
  const { scripts = {} } = await getPackageJson()
  return scripts
}

export const hasAnyDependency = async dependency => {
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

export const getPackageJson = pMemoize(async () =>
  JSON.parse(await fs.readFile(await getPackageJsonPath())),
)

export const getPackageJsonPath = () => fromProjectDirectory(`package.json`)
