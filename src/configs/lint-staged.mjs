import { getHasTest, getHasTypes } from '../helpers/config.js'
import { $ } from '../helpers/command.js'
import { SRC_EXTENSIONS } from '../helpers/matches.js'
import { getPackageJson } from '../helpers/package-json.js'

const getUseAddlicense = async () =>
  (await getPackageJson()).license === `Apache-2.0` &&
  (await $`which addlicense`.exitCode) === 0

const [hasTypes, hasTest, useAddlicense] = await Promise.all([
  getHasTypes(),
  getHasTest(),
  getUseAddlicense(),
])

export default {
  [`*.{${SRC_EXTENSIONS.join(`,`)},md}`]: [`tomer lint --`],
  '*': [
    `tomer format --`,
    useAddlicense && `addlicense`,
    hasTypes && `tomer typecheck --`,
    hasTest && `tomer test --findRelatedTests --no-watch --passWithNoTests`,
  ].filter(Boolean),
}
