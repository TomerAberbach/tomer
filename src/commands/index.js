import * as build from './build.js'
import * as clean from './clean.js'
import * as commitMsg from './commit-msg.js'
import * as format from './format.js'
import * as install from './install.js'
import * as lint from './lint.js'
import * as preCommit from './pre-commit.js'
import * as test from './test.js'
import * as typecheck from './typecheck.js'

const commands = [
  build,
  clean,
  commitMsg,
  format,
  install,
  lint,
  preCommit,
  test,
  typecheck,
]

export default commands
