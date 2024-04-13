import fs from 'node:fs/promises'
import { basename, join, normalize } from 'node:path'
import { babel } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import etz from 'etz'
import {
  concat,
  filter,
  flatMap,
  map,
  pipe,
  reduce,
  toArray,
  toGrouped,
  toMap,
  toSet,
} from 'lfi'
import maxmin from 'maxmin'
import { resolve as exportsResolve } from 'resolve.exports'
import del from 'rollup-plugin-delete'
import dts from 'rollup-plugin-dts'
import { nodeExternals } from 'rollup-plugin-node-externals'
import { $ } from '../helpers/command.js'
import {
  getBrowserslistConfig,
  getTomerConfig,
  hasLocalConfig,
} from '../helpers/config.js'
import { getProjectDirectory } from '../helpers/local.js'
import { SRC_EXTENSIONS } from '../helpers/matches.js'
import { getPackageJson } from '../helpers/package-json.js'

const getRollupConfig = async () => {
  const [projectDirectory, packageJson, browserslistConfig, tomerConfig] =
    await Promise.all([
      getProjectDirectory(),
      getPackageJson(),
      getBrowserslistConfig(),
      getTomerConfig(),
    ])

  const configs = {
    projectDirectory,
    packageJson,
    browserslistConfig,
    tomerConfig,
  }
  const supportedPlatforms = getSupportedPlatforms(configs)
  const parameters = { ...configs, supportedPlatforms }

  const input = getInput(parameters)
  const output = getOutputs(parameters)
  const plugins = await getPlugins(parameters)

  return [{ input, output, plugins }, getDtsConfig(parameters)].filter(Boolean)
}

const getSupportedPlatforms = ({ packageJson, browserslistConfig }) => {
  const isBrowser = Boolean(browserslistConfig)
  const isNode = !isBrowser || Boolean(packageJson.engines?.node)
  return { isBrowser, isNode }
}

const getInput = ({ tomerConfig: { jsInput, tsInput } }) => {
  const input = jsInput ?? tsInput

  if (!input) {
    etz.error(`Couldn't infer input source`)
    process.exit(1)
  }

  return input
}

const getOutputs = ({ packageJson }) =>
  pipe(
    concat(
      [
        [packageJson.main, `cjs`],
        [packageJson.module, `esm`],
        [packageJson.jsnext, `esm`],
        [packageJson.browser, `esm`],
      ],
      pipe(
        getKeysDeep({ '.': packageJson.exports }),
        filter(key => key.startsWith(`.`)),
        flatMap(path => [
          [exportsResolveOrNull(packageJson, path, { require: true }), `cjs`],
          [exportsResolveOrNull(packageJson, path), `esm`],
        ]),
      ),
    ),
    filter(([file]) => Boolean(file)),
    map(([file, format]) => [normalize(file), format]),
    reduce(toGrouped(toSet(), toMap())),
    map(([file, formats]) => ({
      file,
      format: formats.has(`esm`) ? `esm` : `cjs`,
      strict: false,
      exports: `auto`,
      plugins: [
        /\.min\.[^.]+$/u.test(file) && terser(packageJson.terser ?? {}),
      ],
    })),
    reduce(toArray()),
  )

const getKeysDeep = value => ({
  *[Symbol.iterator]() {
    const stack = [value]

    do {
      const value = stack.pop()

      if (!value || typeof value !== `object`) {
        continue
      }

      yield* Object.keys(value)
      stack.push(...Object.values(value))
    } while (stack.length > 0)
  },
})

const exportsResolveOrNull = (...args) => {
  try {
    return exportsResolve(...args)[0]
  } catch {
    return null
  }
}

const getPlugins = async ({
  projectDirectory,
  tomerConfig: { src, tsInput },
  supportedPlatforms: { isNode },
}) => [
  nodeExternals({ deps: true }),
  nodeResolve({
    preferBuiltins: isNode,
    mainFields: [`module`, `main`, `jsnext`, `browser`],
    extensions: [...map(extension => `.${extension}`, SRC_EXTENSIONS), `.json`],
  }),
  reportSizes(),
  commonjs(),
  json(),
  babel({
    ...(!(await hasLocalConfig(`babel`)) &&
      (await import(`./babel.mjs`)).default),
    babelHelpers: `bundled`,
    extensions: SRC_EXTENSIONS,
  }),
  tsInput && {
    name: `output-dts`,
    buildStart: async () => {
      const cachePath = join(projectDirectory, `node_modules/.cache`)
      try {
        await fs.mkdir(cachePath, { recursive: true })
      } catch {}

      const tsConfigBuildPath = join(cachePath, `tsconfig.build.json`)
      await fs.writeFile(
        tsConfigBuildPath,
        JSON.stringify({
          extends: join(projectDirectory, `tsconfig.json`),
          include: [join(projectDirectory, src)],
        }),
      )
      await $`tsc --noEmit false --declaration --emitDeclarationOnly --outDir dist/dts -p ${tsConfigBuildPath}`
    },
  },
]

const reportSizes = () => {
  let initialCode = ``

  return {
    name: `report-sizes`,
    transform: code => {
      initialCode += code
      return code
    },
    generateBundle: ({ file }, bundle) => {
      console.log(
        `${file}: ${maxmin(
          initialCode,
          Object.values(bundle).find(({ isEntry }) => isEntry).code,
          true,
        )}`,
      )
    },
  }
}

const getDtsConfig = ({ packageJson, tomerConfig: { tsInput, dtsInput } }) =>
  (dtsInput || tsInput) && {
    input: dtsInput || join(`dist/dts`, `${basename(tsInput, `.ts`)}.d.ts`),
    output: {
      file: packageJson.types,
      format: `esm`,
    },
    plugins: [
      dts(),
      tsInput &&
        del({
          targets: `dist/dts`,
          hook: `buildEnd`,
        }),
    ],
  }

export default await getRollupConfig()
