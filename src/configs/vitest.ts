import { join } from 'node:path'
import { defineConfig } from 'vitest/config'
import etz from 'etz'
import { asConcur, findConcur, map, mapConcur, orConcur, pipe } from 'lfi'
import tsconfigPaths from 'vite-tsconfig-paths'
import { getProjectDirectory, hasLocalFile } from '../helpers/local.js'
import {
  getBrowserslistConfig,
  getConfigPath,
  getTomerConfig,
} from '../helpers/config.js'
import type { TomerConfig } from '../helpers/config.js'
import { stringify } from '../helpers/json.js'
import { SRC_EXTENSIONS } from '../helpers/matches.js'

const getSetupFiles = ({ test }: TomerConfig): Promise<string[]> =>
  pipe(
    SRC_EXTENSIONS,
    map(extension => join(test, `setup.${extension}`)),
    asConcur,
    findConcur(hasLocalFile),
    mapConcur(path => [path]),
    orConcur((): string[] => []),
  )

const [projectDirectory, { src, test, bench, setupFiles }, browserslistConfig] =
  await Promise.all([
    getProjectDirectory(),
    getTomerConfig().then(async config => ({
      ...config,
      setupFiles: await getSetupFiles(config),
    })),
    getBrowserslistConfig(),
  ])

etz.debug(`Test setup files: ${stringify(setupFiles)}`)

const defaultEnvironment = browserslistConfig ? `jsdom` : `node`
etz.debug(`Default test environemnt: ${stringify(defaultEnvironment)}`)

const srcExtensionsPattern = `{${SRC_EXTENSIONS.join(`,`)}}`
const exclude = [`**/{node_modules,fixtures,helpers}/**/*`, ...setupFiles]
etz.debug(`Excluded test files: ${stringify(exclude)}`)

export default defineConfig({
  plugins: [tsconfigPaths() as any],
  test: {
    root: projectDirectory,
    setupFiles: [getConfigPath(`jest-extended.js`), ...setupFiles],
    environmentMatchGlobs: [
      [join(test, `dom/**/*`), `jsdom`],
      [join(test, `node/**/*`), `node`],
      [`**/*`, defaultEnvironment],
    ],
    include: [join(test, `**/*.${srcExtensionsPattern}`)],
    exclude,
    coverage: { include: [join(src, `**/!(*.d).${srcExtensionsPattern}`)] },
    benchmark: {
      include: [join(bench, `**/*.${srcExtensionsPattern}`)],
      exclude,
    },
  },
})
