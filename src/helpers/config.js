import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { cosmiconfig, defaultLoaders } from 'cosmiconfig'
import browserslist from 'browserslist'
import pMemoize from 'p-memoize'
import { getPackageJsonPath } from './package-json.js'
import { getProjectDirectory, hasLocalFile } from './local.js'

export function getConfigPath(configName) {
  return join(dirname(__dirname), `configs`, configName)
}

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function hasLocalConfig(moduleName) {
  const noDashModuleName = moduleName.replace(`-`, ``)

  return Boolean(
    // The `searchPlaces` and `packageProp` are overly broad for most
    // configurable modules, but this way we can depend on one function for
    // determining whether a module is locally configured. We're not going to be
    // using unsupported configuration files for modules anyway
    await cosmiconfig(moduleName, {
      searchPlaces: [
        `package.json`,
        `.${noDashModuleName}rc`,
        `.${noDashModuleName}rc.json`,
        `.${noDashModuleName}rc.yaml`,
        `.${noDashModuleName}rc.yml`,
        `.${noDashModuleName}rc.js`,
        `.${noDashModuleName}rc.ts`,
        `.${noDashModuleName}rc.cjs`,
        `.${noDashModuleName}rc.mjs`,
        `${moduleName}.config.json`,
        `${moduleName}.config.yaml`,
        `${moduleName}.config.yml`,
        `${moduleName}.config.js`,
        `${moduleName}.config.ts`,
        `${moduleName}.config.cjs`,
        `${moduleName}.config.mjs`,
      ],
      packageProp: [moduleName, `${moduleName}Config`],
      loaders: {
        ...defaultLoaders,
        '.ts': defaultLoaders[`.js`],
        '.mjs': defaultLoaders[`.js`],
      },
    }).search(await getPackageJsonPath()),
  )
}

export const getBrowserslistConfig = pMemoize(async () =>
  browserslist.loadConfig({
    path: await getProjectDirectory(),
  }),
)

export async function getHasTypes() {
  const { tsInput, dtsInput } = await getTomerConfig()
  return Boolean(tsInput || dtsInput)
}

export async function getHasTest() {
  return hasLocalFile((await getTomerConfig()).test)
}

export const getTomerConfig = pMemoize(async () => {
  const { src = `src`, test = `test` } =
    (await cosmiconfig(`tomer`).search(await getPackageJsonPath()))?.config ??
    {}

  const entryPath = join(src, `index`)
  const [jsInput, tsInput, dtsInput] = await Promise.all([
    getLocalFilePath(`${entryPath}.js`),
    getLocalFilePath(`${entryPath}.ts`),
    getLocalFilePath(`${entryPath}.d.ts`),
  ])

  return { src, test, jsInput, tsInput, dtsInput }
})

async function getLocalFilePath(filename) {
  return (await hasLocalFile(filename)) ? filename : null
}
