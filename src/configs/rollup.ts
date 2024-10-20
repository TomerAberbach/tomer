import fs from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { setHas } from 'ts-extras'
import { babel } from '@rollup/plugin-babel'
import type { RollupBabelInputPluginOptions } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import etz from 'etz'
import keyalesce from 'keyalesce'
import {
  asConcur,
  filter,
  filterMapConcur,
  flatMap,
  map,
  pipe,
  reduce,
  reduceConcur,
  toArray,
  unique,
} from 'lfi'
import maxmin from 'maxmin'
import dts from 'rollup-plugin-dts'
import { nodeExternals } from 'rollup-plugin-node-externals'
import treeShakeable from 'rollup-plugin-tree-shakeable'
import type { Options as TerserOptions } from '@rollup/plugin-terser'
import type { PackageJson, TsConfigJson } from 'type-fest'
import type {
  OutputChunk,
  OutputPluginOption,
  Plugin,
  RollupOptions,
} from 'rollup'
import isPathInside from 'is-path-inside'
import {
  getBrowserslistConfig,
  getTomerConfig,
  hasLocalConfig,
} from '../helpers/config.js'
import type { TomerConfig } from '../helpers/config.js'
import { getProjectDirectory } from '../helpers/local.js'
import { SRC_EXTENSIONS } from '../helpers/matches.js'
import { getPackageJson } from '../helpers/package-json.js'
import { stringify } from '../helpers/json.js'

const getAllRollupOptions = async (): Promise<RollupOptions[]> => {
  const [projectDirectory, packageJson, browserslistConfig, tomerConfig] =
    await Promise.all([
      getProjectDirectory(),
      getPackageJson(),
      getBrowserslistConfig(),
      getTomerConfig(),
    ])
  const parameters: Parameters = {
    projectDirectory,
    packageJson,
    tomerConfig,
    supportedPlatforms: getSupportedPlatforms({
      packageJson,
      browserslistConfig,
    }),
  }

  return pipe(
    getOutputs(parameters),
    asConcur,
    filterMapConcur(output => getSingleRollupOptions(output, parameters)),
    reduceConcur(toArray()),
  )
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
  const supportedPlatforms = { isBrowser, isNode }
  etz.debug(`Supported platforms: ${stringify(supportedPlatforms)}`)
  return supportedPlatforms
}

const getOutputs = ({
  projectDirectory,
  packageJson,
  tomerConfig: { dist },
}: Parameters): AnalyzedPath[] => {
  const outputs = pipe(
    [
      packageJson.exports,
      packageJson.bin,
      packageJson.main,
      packageJson.module,
      packageJson.browser,
      packageJson.types,
      packageJson.typings,
    ],
    flatMap(getStringValuesDeep),
    map(path => resolve(projectDirectory, path)),
    filter(path => isPathInside(path, resolve(projectDirectory, dist))),
    unique,
    map(analyzePath),
    reduce(toArray()),
  )
  etz.debug(`Outputs: ${stringify(outputs.map(output => output.path))}`)
  return outputs
}

const getStringValuesDeep = (value: unknown): Iterable<string> => ({
  *[Symbol.iterator]() {
    const stack = [value]

    do {
      const value = stack.pop()
      if (typeof value === `string`) {
        yield value
        continue
      }

      if (!value || typeof value !== `object`) {
        continue
      }

      stack.push(...(Object.values(value) as unknown[]))
    } while (stack.length > 0)
  },
})

const getSingleRollupOptions = async (
  output: AnalyzedPath,
  parameters: Parameters,
): Promise<RollupOptions | null> => {
  const input = await getInput(output, parameters)
  if (input.format?.module === `cjs` && output.format?.module === `esm`) {
    etz.error(`Cannot convert CJS to ESM: ${formatTransform(input, output)}`)
    process.exit(1)
  }

  if (
    setHas(JS_OUTPUT_INPUT_SOURCE_FORMATS, input.format?.source) &&
    output.format?.source === `js`
  ) {
    etz.debug(`Outputting JS: ${formatTransform(input, output)}`)
    return getJsOutputRollupOptions(input, output, parameters)
  }
  if (
    setHas(DTS_OUTPUT_INPUT_SOURCE_FORMATS, input.format?.source) &&
    output.format?.source === `dts`
  ) {
    etz.debug(`Outputting type definitions: ${formatTransform(input, output)}`)
    return getDtsOutputRollupOptions(input, output, parameters)
  }

  if (input.extension === output.extension) {
    etz.debug(`Copying: ${formatTransform(input, output)}`)
    await fs.mkdir(dirname(output.path), { recursive: true })
    await fs.copyFile(input.path, output.path)
    return null
  }

  etz.error(`Cannot convert: ${formatTransform(input, output)}`)
  process.exit(1)
}

const getInput = async (
  output: AnalyzedPath,
  { tomerConfig: { src, dist } }: Parameters,
): Promise<AnalyzedPath> => {
  const inputDirectoryPath = join(src, dirname(relative(dist, output.path)))
  const matchingInputs = pipe(
    await fs.readdir(inputDirectoryPath, { withFileTypes: true }),
    filter(dirent => dirent.isFile()),
    map(dirent => analyzePath(join(inputDirectoryPath, dirent.name))),
    filter(
      input =>
        input.nameWithoutExtension === output.nameWithoutExtension &&
        ((input.format ?? output.format)
          ? isValidSourceFormatTransform(
              input.format?.source,
              output.format?.source,
            )
          : true),
    ),
    reduce(toArray()),
  )
  etz.debug(
    `Matching inputs for ${stringify(output.path)}: ${stringify(matchingInputs.map(input => input.path))}`,
  )

  switch (matchingInputs.length) {
    case 0:
      etz.error(`Cannot find matching input for ${stringify(output.path)}`)
      process.exit(1)
    // eslint-disable-next-line no-fallthrough
    case 1:
      return matchingInputs[0]!
    default:
      etz.error(
        `Found more than one matching input for ${stringify(output.path)}: ${stringify(matchingInputs.map(input => input.path))}`,
      )
      process.exit(1)
  }
}

const isValidSourceFormatTransform = (
  fromFormat?: SourceFormat,
  toFormat?: SourceFormat,
) => VALID_SOURCE_FORMAT_TRANSFORMS.has(keyalesce([fromFormat, toFormat]))
const VALID_SOURCE_FORMAT_TRANSFORMS: ReadonlySet<object> = new Set(
  (
    [
      [`js`, `js`],
      [`jsx`, `js`],
      [`ts`, `js`],
      [`ts`, `dts`],
      [`tsx`, `js`],
      [`tsx`, `dts`],
      [`dts`, `dts`],
    ] satisfies [SourceFormat, SourceFormat][]
  ).map(keyalesce),
)

const JS_OUTPUT_INPUT_SOURCE_FORMATS: ReadonlySet<SourceFormat> = new Set([
  `js`,
  `jsx`,
  `ts`,
  `tsx`,
])
const DTS_OUTPUT_INPUT_SOURCE_FORMATS: ReadonlySet<SourceFormat> = new Set([
  `ts`,
  `tsx`,
  `dts`,
])

const getJsOutputRollupOptions = async (
  input: AnalyzedPath,
  output: AnalyzedPath,
  { packageJson, supportedPlatforms: { isNode } }: Parameters,
): Promise<RollupOptions> => {
  const outputPlugins: OutputPluginOption = []

  etz.debug(
    `Minify ${formatTransform(input, output)}: ${stringify(output.isMinified)}`,
  )
  if (output.isMinified) {
    const terserOptions = (packageJson.terser ?? {}) as TerserOptions
    etz.debug(`Terser options: ${stringify(terserOptions)}`)
    outputPlugins.push(terser(terserOptions))
  }

  const hasSideEffects = packageJson.sideEffects !== false
  etz.debug(`Side effects: ${stringify(hasSideEffects)}`)
  if (!hasSideEffects) {
    outputPlugins.push(treeShakeable())
  }

  const outputDir = dirname(output.path)
  // Const distRelativeOutputPath = relative(distPath, output.path)
  return {
    input: input.path,
    output: {
      dir: outputDir,
      entryFileNames: chunkInfo => {
        if (!chunkInfo.isEntry) {
          etz.error(`Unexpected chunk: ${stringify(chunkInfo)}`)
          process.exit(1)
        }
        return basename(output.path)
      },
      format: output.format?.module,
      strict: false,
      exports: `auto` as const,
      plugins: outputPlugins,
    },
    plugins: [
      nodeExternals({ deps: true }),
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
          (await import(`./babel.js`)).default),
        babelHelpers: `bundled`,
        extensions: SRC_EXTENSIONS,
      } as RollupBabelInputPluginOptions),
    ],
  }
}

const formatTransform = (input: AnalyzedPath, output: AnalyzedPath): string =>
  `${stringify(input.path)} -> ${stringify(output.path)}`

const reportSizes = (): Plugin => {
  let initialCode = ``

  return {
    name: `report-sizes`,
    transform: code => {
      initialCode += code
      return code
    },
    generateBundle: (_, bundle) => {
      const output = Object.values(bundle).find(
        (output): output is OutputChunk =>
          `isEntry` in output && output.isEntry,
      )!
      etz.info(`${output.fileName}: ${maxmin(initialCode, output.code, true)}`)
    },
  }
}

const getDtsOutputRollupOptions = (
  input: AnalyzedPath,
  output: AnalyzedPath,
  { projectDirectory, tomerConfig: { src } }: Parameters,
): RollupOptions => {
  const cachePath = join(projectDirectory, `node_modules/.cache`)
  const tsConfigBuildPath = join(cachePath, `tsconfig.build.json`)
  return {
    input: input.path,
    output: { file: output.path, format: output.format?.module },
    plugins: [
      {
        name: `output-dts`,
        buildStart: async () => {
          await fs.mkdir(cachePath, { recursive: true })
          await fs.writeFile(
            tsConfigBuildPath,
            JSON.stringify({
              extends: join(projectDirectory, `tsconfig.json`),
              include: [join(projectDirectory, src)],
              compilerOptions: {
                incremental: true,
                tsBuildInfoFile: join(cachePath, `tsconfig.tsbuildinfo`),
              },
            } satisfies TsConfigJson),
          )
        },
      },
      dts({ tsconfig: tsConfigBuildPath }),
    ],
  }
}

const analyzePath = (path: string): AnalyzedPath => {
  const extension = getExtension(path)

  let nameWithoutExtension = basename(path, extension)
  const isMinified = nameWithoutExtension.endsWith(`.min`)
  if (isMinified) {
    nameWithoutExtension = nameWithoutExtension.slice(0, -`.min`.length)
  }

  const format = EXTENSION_TO_FORMAT.get(extension)
  return { path, nameWithoutExtension, extension, isMinified, format }
}

type AnalyzedPath = {
  path: string
  nameWithoutExtension: string
  extension: string
  isMinified: boolean
  format?: Format
}

const getExtension = (path: string) => {
  let extension = extname(path)

  const basenameWithoutExtension = basename(path, extension)
  if (extname(basenameWithoutExtension) === `.d`) {
    extension = `.d${extension}`
  }

  return extension
}

const EXTENSION_TO_FORMAT: ReadonlyMap<string, Readonly<Format>> = new Map([
  [`.js`, { source: `js`, module: `esm` }],
  [`.mjs`, { source: `js`, module: `esm` }],
  [`.cjs`, { source: `js`, module: `cjs` }],
  [`.jsx`, { source: `jsx`, module: `esm` }],
  [`.mjsx`, { source: `jsx`, module: `esm` }],
  [`.cjsx`, { source: `jsx`, module: `cjs` }],

  [`.ts`, { source: `ts`, module: `esm` }],
  [`.mts`, { source: `ts`, module: `esm` }],
  [`.cts`, { source: `ts`, module: `cjs` }],
  [`.tsx`, { source: `tsx`, module: `esm` }],
  [`.mtsx`, { source: `tsx`, module: `esm` }],
  [`.ctsx`, { source: `tsx`, module: `cjs` }],

  [`.d.ts`, { source: `dts`, module: `esm` }],
  [`.d.mts`, { source: `dts`, module: `esm` }],
  [`.d.cts`, { source: `dts`, module: `cjs` }],
])

type Format = { source: SourceFormat; module: ModuleFormat }
type SourceFormat = `js` | `jsx` | `ts` | `tsx` | `dts`
type ModuleFormat = `esm` | `cjs`

type Parameters = {
  projectDirectory: string
  packageJson: PackageJson
  tomerConfig: TomerConfig
  supportedPlatforms: SupportedPlatforms
}
type SupportedPlatforms = { isBrowser: boolean; isNode: boolean }

export default await getAllRollupOptions()
