import { basename, join, normalize } from 'path'
import fs from 'fs/promises'
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
import { externals } from 'rollup-plugin-node-externals'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import { babel } from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'
import { resolve as exportsResolve } from 'resolve.exports'
import dts from 'rollup-plugin-dts'
import del from 'rollup-plugin-delete'
import { getPackageJson } from '../helpers/package-json.js'
import { SRC_EXTENSIONS } from '../helpers/matches.js'
import {
  getBrowserslistConfig,
  getTomerConfig,
  hasLocalConfig,
} from '../helpers/config.js'
import { getProjectDirectory } from '../helpers/local.js'
import { $ } from '../helpers/command.js'

async function getRollupConfig() {
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

function getSupportedPlatforms({ packageJson, browserslistConfig }) {
  const isBrowser = Boolean(browserslistConfig)
  const isNode = !isBrowser || Boolean(packageJson.engines?.node)
  return { isBrowser, isNode }
}

function getInput({ tomerConfig: { jsInput, tsInput } }) {
  const input = jsInput ?? tsInput

  if (!input) {
    etz.error(`Couldn't infer input source`)
    process.exit(1)
  }

  return input
}

function getOutputs({ packageJson }) {
  return pipe(
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
}

function getKeysDeep(value) {
  return {
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
  }
}

function exportsResolveOrNull(...args) {
  try {
    return exportsResolve(...args)
  } catch {
    return null
  }
}

async function getPlugins({
  projectDirectory,
  tomerConfig: { tsInput },
  supportedPlatforms: { isNode },
}) {
  return [
    externals({ deps: true }),
    nodeResolve({
      preferBuiltins: isNode,
      mainFields: [`module`, `main`, `jsnext`, `browser`],
      extensions: [
        ...map(extension => `.${extension}`, SRC_EXTENSIONS),
        `.json`,
      ],
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
      async buildStart() {
        const cachePath = join(projectDirectory, `node_modules/.cache`)
        try {
          await fs.mkdir(cachePath, { recursive: true })
        } catch {}

        const tsConfigBuildPath = join(cachePath, `tsconfig.build.json`)
        await fs.writeFile(
          tsConfigBuildPath,
          JSON.stringify({
            extends: join(projectDirectory, `tsconfig.json`),
            include: [projectDirectory],
            exclude: [
              join(projectDirectory, `test`),
              join(projectDirectory, `dist`),
            ],
          }),
        )
        await $`tsc --noEmit false --declaration --emitDeclarationOnly --outDir dist/dts -p ${tsConfigBuildPath}`
      },
    },
  ]
}

function reportSizes() {
  let initialCode = ``

  return {
    name: `report-sizes`,
    transform(code) {
      initialCode += code
      return code
    },
    generateBundle({ file }, bundle) {
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

function getDtsConfig({ packageJson, tomerConfig: { tsInput, dtsInput } }) {
  return (
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
  )
}

export default await getRollupConfig()
