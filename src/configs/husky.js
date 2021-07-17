import { join, relative } from 'path'
import { rootPath } from '../util.js'
import { getConfigPath } from './index.js'

const getBinPath = name => join(`node_modules/.bin`, name)

const getRelativeConfigPath = name => relative(rootPath, getConfigPath(name))

const config = {
  'commit-msg': `${getBinPath(`commitlint`)} --config ${getRelativeConfigPath(
    `commitlint.json`,
  )} --edit "$1"`,
  'pre-commit': `${getBinPath(`lint-staged`)} --config ${getRelativeConfigPath(
    `lint-staged.json`,
  )}`,
}

export default config
