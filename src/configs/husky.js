import { join } from 'path'
import rootPath from '../root.js'
import { getConfigPath } from './index.js'

const getBinPath = name => join(rootPath, `node_modules/.bin`, name)

const config = {
  'commit-msg': `${getBinPath(`commitlint`)} --config ${getConfigPath(
    `commitlint.json`,
  )} --edit "$1"`,
  'pre-commit': `${getBinPath(`lint-staged`)} --config ${getConfigPath(
    `lint-staged.json`,
  )}`,
}

export default config
