import etz from 'etz'
import minVersion from 'semver/ranges/min-version.js'
import type { TransformOptions } from '@babel/core'
import {
  getBrowserslistConfig,
  getHasReact,
  getHasTypes,
} from '../helpers/config.js'
import { getPackageJson } from '../helpers/package-json.js'
import resolveImport from '../helpers/resolve-import.js'
import { stringify } from '../helpers/json.js'

const getBabelConfig = async (): Promise<TransformOptions> => {
  const [babelPresetTypeScript, babelPresetReact, browserslistConfig] =
    await Promise.all([
      getBabelPresetTypeScriptPath(),
      getBabelPresetReactPath(),
      getResolvedBrowserslistConfig(),
    ])

  const config: TransformOptions = {
    parserOpts: { plugins: [`v8intrinsic`] },
    presets: [
      [
        getBabelPresetEnvPath(),
        { modules: false, loose: true, targets: browserslistConfig },
      ],
      babelPresetTypeScript,
      babelPresetReact && [babelPresetReact, { runtime: `automatic` }],
    ].filter(path => typeof path === `string`),
  }
  etz.debug(`Babel config: ${stringify(config)}`)

  return config
}

const getBabelPresetEnvPath = (): string =>
  resolveImportHere(`@babel/preset-env`)

const getBabelPresetTypeScriptPath = async (): Promise<string | undefined> =>
  (await getHasTypes())
    ? resolveImportHere(`@babel/preset-typescript`)
    : undefined

const getBabelPresetReactPath = async (): Promise<string | undefined> =>
  (await getHasReact()) ? resolveImportHere(`@babel/preset-react`) : undefined

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
    etz.error(`Failed to infer supported browser or node versions`)
    process.exit(1)
  }

  const minNodeVersion = minVersion(nodeVersion)
  if (!minNodeVersion) {
    etz.error(
      `Failed to parse "engines"."node".${stringify(nodeVersion)} as semver`,
    )
    process.exit(1)
  }

  return `node ${minNodeVersion.raw}`
}

export default await getBabelConfig()
