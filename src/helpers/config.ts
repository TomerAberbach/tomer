import browserslist from 'browserslist'
import { cosmiconfig } from 'cosmiconfig'
import { concat, flatMap, map, pipe, reduce, toObject } from 'lfi'
import pMemoize from 'p-memoize'
import etz from 'etz'
import { getPath } from '../path.js'
import { getProjectDirectory } from './local.js'
import { SRC_EXTENSIONS } from './matches.js'
import {
  getPackageJsonPath,
  getPackageJsonScripts,
  hasAnyDependency,
} from './package-json.js'
import { stringify } from './json.js'

export const getConfigPath = (configName: string): string =>
  getPath(`configs`, configName)

export const hasLocalConfig = pMemoize(
  async (moduleName: string): Promise<boolean> => {
    const noDashModuleName = moduleName.replace(`-`, ``)
    // The `searchPlaces` and `packageProp` are overly broad for most
    // configurable modules, but this way we can depend on one function for
    // determining whether a module is locally configured. We're not going to be
    // using unsupported configuration files for modules anyway
    const searchResult = await cosmiconfig(moduleName, {
      searchStrategy: `global`,
      searchPlaces: [
        `package.json`,
        `.${noDashModuleName}rc`,
        ...pipe(
          CONFIG_EXTENSIONS,
          flatMap(ext => [
            `.${noDashModuleName}rc.${ext}`,
            `${moduleName}.config.${ext}`,
          ]),
        ),
      ],
      packageProp: [moduleName, `${moduleName}Config`],
      loaders: pipe(
        concat(
          map(ext => `.${ext}`, CONFIG_EXTENSIONS),
          [`noExt`],
        ),
        map(ext => [ext, () => true] as const),
        reduce(toObject()),
      ),
    }).search(await getPackageJsonPath())
    if (!searchResult) {
      etz.debug(`Has local ${stringify(moduleName)} config: false`)
      return false
    }

    etz.debug(
      `Has local ${stringify(moduleName)} config: ${stringify(searchResult.filepath)}`,
    )
    return true
  },
)

const CONFIG_EXTENSIONS = [`json`, `yaml`, `yml`].concat(SRC_EXTENSIONS)

export const getBrowserslistConfig = pMemoize(
  async (): Promise<string[] | undefined> => {
    const config = browserslist.loadConfig({
      path: await getProjectDirectory(),
    })
    etz.debug(`Browserlists config: ${stringify(config)}`)
    return config
  },
)

export const getHasTypes = pMemoize(async (): Promise<boolean> => {
  const hasTypes = Boolean((await getPackageJsonScripts()).typecheck)
  etz.debug(`Has types: ${stringify(hasTypes)}`)
  return hasTypes
})

export const getHasReact = pMemoize(async (): Promise<boolean> => {
  const hasReact = await hasAnyDependency(`react`)
  etz.debug(`Has react: ${stringify(hasReact)}`)
  return hasReact
})

export const getTomerConfig = pMemoize(async (): Promise<TomerConfig> => {
  const {
    src = `src`,
    test = `test`,
    bench = `bench`,
    dist = `dist`,
  } = ((
    await cosmiconfig(`tomer`, { searchStrategy: `global` }).search(
      await getPackageJsonPath(),
    )
  )?.config as Record<string, string> | undefined) ?? {}

  const config = { src, test, bench, dist }
  etz.debug(`Tomer config: ${stringify(config)}`)
  return config
})

export type TomerConfig = {
  src: string
  test: string
  bench: string
  dist: string
}
