import './helpers/env.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import widestLine from 'widest-line'
import commands from './commands/index.js'

const logo = String.raw`
______ ______  __    __  ______  ______
/\__  _/\  __ \/\ "-./  \/\  ___\/\  == \
\/_/\ \\ \ \/\ \ \ \-./\ \ \  __\\ \  __<
   \ \_\\ \_____\ \_\ \ \_\ \_____\ \_\ \_\
    \/_/ \/_____/\/_/  \/_/\/_____/\/_/ /_/
`.trimStart()

const argv = hideBin(process.argv)

if (argv.length === 0 && yargs().terminalWidth() >= widestLine(logo)) {
  console.log(logo)
}

const usage = `
Probably frobs some stuff.

Usage: $0 <command> [options]
`.trim()

yargs(argv)
  .parserConfiguration({
    'populate--': true,
    'unknown-options-as-args': true,
  })
  .usage(usage)
  .help()
  .alias(`h`, `help`)
  .version()
  .alias(`v`, `version`)
  .command(commands)
  .demandCommand()
  .parse()
