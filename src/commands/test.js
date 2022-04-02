import isCI from 'is-ci'
import { $, inherit } from '../helpers/command.js'
import { hasLocalConfig } from '../helpers/config.js'
import getBinPath from '../helpers/bin-path.js'

export const command = `test`

export const description = `Runs tests using Jest!`

export async function handler({ _: [, ...jestArgs] }) {
  process.env.BABEL_ENV = `test`
  process.env.NODE_ENV = `test`
  process.env.NODE_OPTIONS = `--experimental-vm-modules --no-warnings`

  const jestArgsSet = new Set(jestArgs)

  const [binPath, configArgs] = await Promise.all([
    getBinPath(`jest`),
    getConfigArgs(jestArgsSet),
  ])

  await inherit(
    $`node --expose-gc --allow-natives-syntax ${binPath} ${getWatchArgs(
      jestArgsSet,
    )} ${configArgs} ${jestArgs}`,
  )
}

function getWatchArgs(jestArgsSet) {
  if (
    isCI ||
    jestArgsSet.has(`--no-watch`) ||
    jestArgsSet.has(`--coverage`) ||
    jestArgsSet.has(`--updateSnapshot`)
  ) {
    return []
  }

  return [`--watch`]
}

async function getConfigArgs(jestArgsSet) {
  if (
    jestArgsSet.has(`--config`) ||
    jestArgsSet.has(`-c`) ||
    (await hasLocalConfig(`jest`))
  ) {
    return []
  }

  return [
    `--config`,
    JSON.stringify((await import(`../configs/jest.mjs`)).default),
  ]
}
