import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import browserslist from 'browserslist'
import { cosmiconfig } from 'cosmiconfig'
import { concat, flatMap, map, pipe, reduce, toObject } from 'lfi'
import pMemoize from 'p-memoize'
import { getProjectDirectory, hasLocalFile } from './local.js'
import { SRC_EXTENSIONS } from './matches.js'
import { getPackageJsonPath, getPackageJsonScripts } from './package-json.js'

export const getConfigPath = (
  directory: `src` | `dist`,
  configName: string,
): string => join(dirname(dirname(__dirname)), directory, `configs`, configName)

const __dirname = dirname(fileURLToPath(import.meta.url))

export const hasLocalConfig = async (moduleName: string): Promise<boolean> => {
  const noDashModuleName = moduleName.replace(`-`, ``)

  return Boolean(
    // The `searchPlaces` and `packageProp` are overly broad for most
    // configurable modules, but this way we can depend on one function for
    // determining whether a module is locally configured. We're not going to be
    // using unsupported configuration files for modules anyway
    await cosmiconfig(moduleName, {
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
    }).search(await getPackageJsonPath()),
  )
}

const CONFIG_EXTENSIONS = [`json`, `yaml`, `yml`].concat(SRC_EXTENSIONS)

export const getBrowserslistConfig = pMemoize(
  async (): Promise<string[] | undefined> =>
    browserslist.loadConfig({ path: await getProjectDirectory() }),
)

export const getHasTypes = async (): Promise<boolean> =>
  Boolean((await getPackageJsonScripts()).typecheck)

export const getTomerConfig = pMemoize(async (): Promise<TomerConfig> => {
  const { src = `src`, test = `test` } =
    ((
      await cosmiconfig(`tomer`, { searchStrategy: `global` }).search(
        await getPackageJsonPath(),
      )
    )?.config as Record<string, string> | undefined) ?? {}

  const entryPath = join(src, `index`)
  const [jsInput, tsInput, dtsInput] = await Promise.all([
    getLocalFilePath(`${entryPath}.js`),
    getLocalFilePath(`${entryPath}.ts`),
    getLocalFilePath(`${entryPath}.d.ts`),
  ])

  return { src, test, jsInput, tsInput, dtsInput }
})

export type TomerConfig = {
  src: string
  test: string
  jsInput: string | null
  tsInput: string | null
  dtsInput: string | null
}

const getLocalFilePath = async (filename: string): Promise<string | null> =>
  (await hasLocalFile(filename)) ? filename : null
