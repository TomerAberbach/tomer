import { asConcur, findConcur, map, mapConcur, orConcur, pipe } from 'lfi'
import { createRequire } from 'module'
import { join } from 'path'
import {
  getBrowserslistConfig,
  getTomerConfig,
  hasLocalConfig,
} from '../helpers/config.js'
import { getProjectDirectory, hasLocalFile } from '../helpers/local.js'
import { SRC_EXTENSIONS } from '../helpers/matches.js'
import resolveImport from '../helpers/resolve-import.js'

const require = createRequire(import.meta.url)

const getJestConfig = async () => {
  const [
    jestWatchTypeaheadFilename,
    jestWatchTypeaheadTestname,
    jestSerializerPath,
  ] = getJestPluginImports()
  const [[{ src, test }, setupFilesAfterEnv], transform, browserslistConfig] =
    await Promise.all([
      getTomerConfig().then(tomerConfig =>
        Promise.all([tomerConfig, getJestSetupFilesAfterEnv(tomerConfig)]),
      ),
      getJestTransform(),
      getBrowserslistConfig(),
    ])

  const srcExtensionsPattern = `{${SRC_EXTENSIONS.join(`,`)}}`
  const jestIgnorePatterns = [
    `/node_modules/`,
    `/fixtures/`,
    `/${test}/helpers/`,
    ...setupFilesAfterEnv,
  ]

  return {
    roots: [join(`<rootDir>`, src), join(`<rootDir>`, test)],
    extensionsToTreatAsEsm: [`.mts`, `.ts`],
    moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': `$1`,
    },
    testEnvironment: browserslistConfig ? `jsdom` : `node`,
    moduleFileExtensions: SRC_EXTENSIONS,
    collectCoverageFrom: [
      join(`<rootDir>`, src, `**/!(*.d).${srcExtensionsPattern}`),
    ],
    testMatch: [join(`<rootDir>`, test, `**/*.${srcExtensionsPattern}`)],
    testPathIgnorePatterns: jestIgnorePatterns,
    coveragePathIgnorePatterns: jestIgnorePatterns,
    coverageThreshold: {
      global: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    watchPlugins: [jestWatchTypeaheadFilename, jestWatchTypeaheadTestname],
    snapshotSerializers: [jestSerializerPath],
    setupFilesAfterEnv,
    ...transform,
  }
}

const getJestPluginImports = () =>
  [
    `jest-watch-typeahead/filename`,
    `jest-watch-typeahead/testname`,
    `jest-serializer-path`,
  ].map(specifier => resolveImport(specifier, import.meta.url))

const getJestSetupFilesAfterEnv = async ({ test }) => {
  const setupFilesAfterEnv = await pipe(
    SRC_EXTENSIONS,
    map(extension => join(test, `setup-env.${extension}`)),
    asConcur,
    findConcur(hasLocalFile),
    mapConcur(async path => [join(await getProjectDirectory(), path)]),
    orConcur(() => []),
  )

  return [require.resolve(`jest-extended/all`), ...setupFilesAfterEnv]
}

const getJestTransform = async () => {
  if (await hasLocalConfig(`babel`)) {
    return {}
  }

  return {
    transform: {
      [`^.+\\.(${SRC_EXTENSIONS.join(`|`)})`]: await resolveImport(
        `./babel-transform.mjs`,
        import.meta.url,
      ),
    },
  }
}

export default await getJestConfig()
