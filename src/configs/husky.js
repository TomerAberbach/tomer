import { getConfigPath } from './index.js'

const config = {
  'commit-msg': `pnpx --no-install commitlint --config ${getConfigPath(
    `commitlint.json`,
  )} --edit "$1"`,
  'pre-commit': `pnpx --no-install lint-staged --config ${getConfigPath(
    `lint-staged.json`,
  )}`,
}

export default config
