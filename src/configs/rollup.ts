import fs from 'node:fs/promises'
import { basename, join, normalize } from 'node:path'
import { babel } from '@rollup/plugin-babel'
import type { RollupBabelInputPluginOptions } from '@rollup/plugin-babel'
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
import treeShakeable from 'rollup-plugin-tree-shakeable'
import type { Options as TerserOptions } from '@rollup/plugin-terser'
import type { PackageJson } from 'type-fest'
import type { OutputChunk, OutputOptions, Plugin } from 'rollup'
import { $ } from '../helpers/command.js'
import {
  getBrowserslistConfig,
  getTomerConfig,
  hasLocalConfig,
} from '../helpers/config.js'
import type { TomerConfig } from '../helpers/config.js'
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

const getSupportedPlatforms = ({
  packageJson,
  browserslistConfig,
}: {
  packageJson: PackageJson
  browserslistConfig: string[] | undefined
}): { isBrowser: boolean; isNode: boolean } => {
  const isBrowser = Boolean(browserslistConfig)
  const isNode = !isBrowser || Boolean(packageJson.engines?.node)
  return { isBrowser, isNode }
}

const getInput = ({
  tomerConfig: { jsInput, tsInput },
}: {
  tomerConfig: TomerConfig
}): string => {
  const input = jsInput ?? tsInput

  if (!input) {
    etz.error(`Couldn't infer input source`)
    process.exit(1)
  }

  return input
}

const getOutputs = ({
  packageJson,
}: {
  packageJson: PackageJson
}): OutputOptions[] =>
  pipe(
    concat(
      [
        [packageJson.main, `cjs`],
        [packageJson.module, `esm`],
        [packageJson.jsnext, `esm`],
        [packageJson.browser, `esm`],
      ] as [string | null, string][],
      pipe(
        getKeysDeep({ '.': packageJson.exports }),
        filter(key => key.startsWith(`.`)),
        flatMap((path): [string | null, string][] => [
          [exportsResolveOrNull(packageJson, path, { require: true }), `cjs`],
          [exportsResolveOrNull(packageJson, path), `esm`],
        ]),
      ),
    ),
    filter(
      ([file]) =>
        Boolean(file) &&
        SRC_EXTENSIONS.some(extension => file!.endsWith(`.${extension}`)),
    ),
    map(([file, format]) => [normalize(file!), format] as const),
    reduce(toGrouped(toSet(), toMap())),
    map(([file, formats]) => ({
      file,
      format: formats.has(`esm`) ? (`esm` as const) : (`cjs` as const),
      strict: false,
      exports: `auto` as const,
      plugins: [
        /\.min\.[^.]+$/u.test(file) &&
          terser((packageJson.terser ?? {}) as TerserOptions),
        packageJson.sideEffects === false && treeShakeable(),
      ],
    })),
    reduce(toArray()),
  )

const getKeysDeep = (value: unknown): Iterable<string> => ({
  *[Symbol.iterator]() {
    const stack = [value]

    do {
      const value = stack.pop()

      if (!value || typeof value !== `object`) {
        continue
      }

      yield* Object.keys(value)
      stack.push(...(Object.values(value) as unknown[]))
    } while (stack.length > 0)
  },
})

const exportsResolveOrNull = (
  ...args: Parameters<typeof exportsResolve>
): string | null => {
  try {
    return (exportsResolve(...args) as [string, ...string[]])[0]
  } catch {
    return null
  }
}

const getPlugins = async ({
  projectDirectory,
  tomerConfig: { src, tsInput },
  supportedPlatforms: { isNode },
}: {
  projectDirectory: string
  tomerConfig: TomerConfig
  supportedPlatforms: { isNode: boolean }
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
      (await import(`./babel.js`)).default),
    babelHelpers: `bundled`,
    extensions: SRC_EXTENSIONS,
  } as RollupBabelInputPluginOptions),
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
      await $`tsc --noEmit false --declaration --emitDeclarationOnly --outDir dist/dts -p ${tsConfigBuildPath}`.nothrow()
    },
  },
]

const reportSizes = (): Plugin => {
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
          Object.values(bundle).find(
            (output): output is OutputChunk =>
              `isEntry` in output && output.isEntry,
          )!.code,
          true,
        )}`,
      )
    },
  }
}

const getDtsConfig = ({
  packageJson,
  tomerConfig: { tsInput, dtsInput },
}: {
  packageJson: PackageJson
  tomerConfig: TomerConfig
}) =>
  (dtsInput ?? tsInput) && {
    input: dtsInput ?? join(`dist/dts`, `${basename(tsInput!, `.ts`)}.d.ts`),
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
