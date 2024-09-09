import { entries, filter, map, pipe, reduce, toObject } from 'lfi'
import { SRC_EXTENSIONS } from '../helpers/matches.js'
import { getPackageJsonScripts } from '../helpers/package-json.js'

const scripts = await getPackageJsonScripts()

const script = (names: string | string[], flags: string) => {
  const name = [names].flat().find(name => scripts[name])
  return name && `npm run ${name} -- ${flags}`
}

const config = {
  [`*.{${SRC_EXTENSIONS.join(`,`)},md}`]: [script(`lint`, `--`)],
  '*': [
    script(`format`, `--`),
    script(`typecheck`, `--`),
    script(
      [`test:unit`, `test`],
      `--watch=false --passWithNoTests --changed --`,
    ),
  ],
}

export default pipe(
  entries(config),
  map(([key, value]) => [key, value.filter(Boolean)] as const),
  filter(([, value]) => value.length > 0),
  reduce(toObject()),
)
