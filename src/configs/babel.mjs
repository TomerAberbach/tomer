import etz from 'etz'
import { map } from 'lfi'
import minVersion from 'semver/ranges/min-version.js'
import { getBrowserslistConfig, getHasTypes } from '../helpers/config.js'
import { getPackageJson, hasAnyDependency } from '../helpers/package-json.js'
import resolveImport from '../helpers/resolve-import.js'

async function getBabelConfig() {
  const [
    babelPresetEnv,
    babelPresetTypeScript,
    babelPresetReact,
    browserslistConfig,
    packageJson,
  ] = await Promise.all([
    ...map(
      specifier =>
        Promise.resolve(specifier).then(
          specifier => specifier && resolveImport(specifier, import.meta.url),
        ),
      [`@babel/preset-env`, getBabelPresetTypeScript(), getBabelPresetReact()],
    ),
    getResolvedBrowserslistConfig(),
    getPackageJson(),
  ])

  return {
    parserOpts: {
      plugins: [`v8intrinsic`],
    },
    presets: [
      [
        babelPresetEnv,
        {
          modules: packageJson.type === `module` ? false : `cjs`,
          loose: true,
          targets: browserslistConfig,
        },
      ],
      babelPresetTypeScript,
      babelPresetReact && [babelPresetReact, { runtime: `automatic` }],
    ].filter(Boolean),
  }
}

async function getBabelPresetTypeScript() {
  return (await getHasTypes()) && `@babel/preset-typescript`
}

async function getBabelPresetReact() {
  return (await hasAnyDependency(`react`)) && `@babel/preset-react`
}

async function getResolvedBrowserslistConfig() {
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
