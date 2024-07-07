import { entries, filter, map, pipe, reduce, toObject } from 'lfi'
import { $ } from '../helpers/command.js'
import { SRC_EXTENSIONS } from '../helpers/matches.js'
import {
  getPackageJson,
  getPackageJsonScripts,
} from '../helpers/package-json.js'

const getUseAddlicense = async (): Promise<boolean> =>
  (await getPackageJson()).license === `Apache-2.0` &&
  (await $`which addlicense`.exitCode) === 0

const [scripts, useAddlicense] = await Promise.all([
  getPackageJsonScripts(),
  getUseAddlicense(),
])

const script = (names: string | string[], flags: string) => {
  const name = [names].flat().find(name => scripts[name])
  return name && `npm run ${name} -- ${flags}`
}

const config = {
  [`*.{${SRC_EXTENSIONS.join(`,`)},md}`]: [script(`lint`, `--`)],
  '*': [
    script(`format`, `--`),
    useAddlicense && `addlicense`,
    script(`typecheck`, `--`),
    script(
      [`test:unit`, `test`],
      `--watchAll=false --passWithNoTests --findRelatedTests`,
    ),
  ],
}

export default pipe(
  entries(config),
  map(([key, value]) => [key, value.filter(Boolean)] as const),
  filter(([, value]) => value.length > 0),
  reduce(toObject()),
)
