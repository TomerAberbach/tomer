import etz from 'etz'
import minVersion from 'semver/ranges/min-version.js'
import type { TransformOptions } from '@babel/core'
import { getBrowserslistConfig, getHasTypes } from '../helpers/config.js'
import { getPackageJson, hasAnyDependency } from '../helpers/package-json.js'
import resolveImport from '../helpers/resolve-import.js'

const getBabelConfig = async (): Promise<TransformOptions> => {
  const [babelPresetTypeScript, babelPresetReact, browserslistConfig] =
    await Promise.all([
      getBabelPresetTypeScriptPath(),
      getBabelPresetReactPath(),
      getResolvedBrowserslistConfig(),
    ])

  return {
    parserOpts: {
      plugins: [`v8intrinsic`],
    },
    presets: [
      [
        getBabelPresetEnvPath(),
        {
          modules: false,
          loose: true,
          targets: browserslistConfig,
        },
      ],
      babelPresetTypeScript,
      babelPresetReact && [babelPresetReact, { runtime: `automatic` }],
    ].filter(path => typeof path === `string`),
  }
}

const getBabelPresetEnvPath = (): string =>
  resolveImportHere(`@babel/preset-env`)

const getBabelPresetTypeScriptPath = async (): Promise<string | undefined> =>
  (await getHasTypes())
    ? resolveImportHere(`@babel/preset-typescript`)
    : undefined

const getBabelPresetReactPath = async (): Promise<string | undefined> =>
  (await hasAnyDependency(`react`))
    ? resolveImportHere(`@babel/preset-react`)
    : undefined

const resolveImportHere = (specifier: string): string =>
  resolveImport(specifier, import.meta.url)

const getResolvedBrowserslistConfig = async (): Promise<string | string[]> => {
  const { BABEL_ENV, NODE_ENV } = process.env
  if ((BABEL_ENV ?? NODE_ENV) === `test`) {
    return `current node`
  }

  const browserslistConfig = await getBrowserslistConfig()

  if (browserslistConfig) {
    return browserslistConfig
  }

  const { engines: { node: nodeVersion } = {} } = await getPackageJson()

  if (!nodeVersion) {
    etz.warn(
      `Neither browserslist nor engines.node were specified. Assuming maintained node versions`,
    )
    return `maintained node versions`
  }

  const minNodeVersion = minVersion(nodeVersion)

  if (!minNodeVersion) {
    etz.error(`Couldn't parse engines.node.${nodeVersion} as semver`)
    process.exit(1)
  }

  return `node ${minNodeVersion.raw}`
}

export default await getBabelConfig()
