import etz from 'etz'
import minVersion from 'semver/ranges/min-version.js'
import { getBrowserslistConfig, getHasTypes } from '../helpers/config.js'
import {
  getIsTypeModule,
  getPackageJson,
  hasAnyDependency,
} from '../helpers/package-json.js'
import resolveImport from '../helpers/resolve-import.js'

const getBabelConfig = async () => {
  const [
    babelPresetEnv,
    babelPresetTypeScript,
    babelPresetReact,
    browserslistConfig,
    isTypeModule,
  ] = await Promise.all([
    getBabelPresetEnvPath(),
    getBabelPresetTypeScriptPath(),
    getBabelPresetReactPath(),
    getResolvedBrowserslistConfig(),
    getIsTypeModule(),
  ])

  return {
    parserOpts: {
      plugins: [`v8intrinsic`],
    },
    presets: [
      [
        babelPresetEnv,
        {
          modules: isTypeModule ? false : `cjs`,
          loose: true,
          targets: browserslistConfig,
        },
      ],
      babelPresetTypeScript,
      babelPresetReact && [babelPresetReact, { runtime: `automatic` }],
    ].filter(Boolean),
  }
}

const getBabelPresetEnvPath = () => resolveImportHere(`@babel/preset-env`)

const getBabelPresetTypeScriptPath = async () =>
  (await getHasTypes()) && resolveImportHere(`@babel/preset-typescript`)

const getBabelPresetReactPath = async () =>
  (await hasAnyDependency(`react`)) && resolveImportHere(`@babel/preset-react`)

const resolveImportHere = specifier => resolveImport(specifier, import.meta.url)

const getResolvedBrowserslistConfig = async () => {
  const { BABEL_ENV, NODE_ENV } = process.env
  if ((BABEL_ENV || NODE_ENV) === `test`) {
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
