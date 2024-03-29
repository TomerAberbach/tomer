import isCI from 'is-ci'
import getBinPath from '../helpers/bin-path.js'
import { $, inherit } from '../helpers/command.js'
import { hasLocalConfig } from '../helpers/config.js'

export const command = `test`

export const description = `Runs tests using Jest!`

export const handler = async ({ _: [, ...jestArgs] }) => {
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

const getWatchArgs = jestArgsSet =>
  isCI ||
  jestArgsSet.has(`--watchAll=false`) ||
  jestArgsSet.has(`--coverage`) ||
  jestArgsSet.has(`--updateSnapshot`)
    ? []
    : [`--watch`]

const getConfigArgs = async jestArgsSet =>
  jestArgsSet.has(`--config`) ||
  jestArgsSet.has(`-c`) ||
  (await hasLocalConfig(`jest`))
    ? []
    : [
        `--config`,
        JSON.stringify((await import(`../configs/jest.mjs`)).default),
      ]
