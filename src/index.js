import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import widestLine from 'widest-line'
import commands from './commands/index.js'

let usage = `
Probably frobs some stuff.

Usage: $0 <command> [options]
`

const logo = String.raw`
______ ______  __    __  ______  ______
/\__  _/\  __ \/\ "-./  \/\  ___\/\  == \
\/_/\ \\ \ \/\ \ \ \-./\ \ \  __\\ \  __<
   \ \_\\ \_____\ \_\ \ \_\ \_____\ \_\ \_\
    \/_/ \/_____/\/_/  \/_/\/_____/\/_/ /_/
`

if (yargs().terminalWidth() >= widestLine(logo)) {
  usage = logo + usage
}

yargs(hideBin(process.argv))
  .strict()
  .usage(usage)
  .help()
  .alias(`h`, `help`)
  .version()
  .alias(`v`, `version`)
  .command(commands)
  .demandCommand()
  .parse()
