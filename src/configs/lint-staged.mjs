import { entries, filter, pipe, reduce, toObject } from 'lfi'
import { $ } from '../helpers/command.js'
import { SRC_EXTENSIONS } from '../helpers/matches.js'
import {
  getPackageJson,
  getPackageJsonScripts,
} from '../helpers/package-json.js'

const getUseAddlicense = async () =>
  (await getPackageJson()).license === `Apache-2.0` &&
  (await $`which addlicense`.exitCode) === 0

const [scripts, useAddlicense] = await Promise.all([
  getPackageJsonScripts(),
  getUseAddlicense(),
])

const script = (names, flags) => {
  const name = [names].flat().find(name => scripts[name])
  return name && `npm run ${name} --${flags ? ` ${flags}` : ``} --`
}

const config = {
  [`*.{${SRC_EXTENSIONS.join(`,`)},md}`]: [script(`lint`)],
  '*': [
    script(`format`),
    useAddlicense && `addlicense`,
    script(`typecheck`),
    script(
      [`test:unit`, `test`],
      `--findRelatedTests --no-watch --passWithNoTests`,
    ),
  ],
}

export default pipe(
  entries(config),
  filter(([, value]) => value.length > 0),
  reduce(toObject()),
)
