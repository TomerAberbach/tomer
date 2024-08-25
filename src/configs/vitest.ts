import { join } from 'node:path'
import { defineConfig } from 'vitest/config'
import etz from 'etz'
import tsconfigPaths from 'vite-tsconfig-paths'
import { getProjectDirectory } from '../helpers/local.js'
import {
  getBrowserslistConfig,
  getConfigPath,
  getTomerConfig,
} from '../helpers/config.js'
import { stringify } from '../helpers/json.js'
import { SRC_EXTENSIONS } from '../helpers/matches.js'

const [projectDirectory, { src, test, bench }, browserslistConfig] =
  await Promise.all([
    getProjectDirectory(),
    getTomerConfig(),
    getBrowserslistConfig(),
  ])

const defaultEnvironment = browserslistConfig ? `jsdom` : `node`
etz.debug(`Default test environemnt: ${stringify(defaultEnvironment)}`)

const srcExtensionsPattern = `{${SRC_EXTENSIONS.join(`,`)}}`
const exclude = [`**/{node_modules,fixtures,helpers}/**/*`]

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    root: projectDirectory,
    setupFiles: [getConfigPath(`jest-extended.js`)],
    environmentMatchGlobs: [
      [join(test, `tests/dom/**/*`), `jsdom`],
      [join(test, `tests/node/**/*`), `node`],
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
