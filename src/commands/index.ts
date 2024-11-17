import * as bench from './bench.js'
import * as build from './build.js'
import * as clean from './clean.js'
import type { CommandModule } from './command-module.js'
import * as format from './format.js'
import * as install from './install.js'
import * as lint from './lint.js'
import * as test from './test.js'
import * as typecheck from './typecheck.js'

const commands: CommandModule[] = [
  bench,
  build,
  clean,
  format,
  install,
  lint,
  test,
  typecheck,
]

export default commands
