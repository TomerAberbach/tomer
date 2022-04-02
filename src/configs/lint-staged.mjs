import { getHasTest, getHasTypes } from '../helpers/config.js'
import { $ } from '../helpers/command.js'
import { SRC_EXTENSIONS } from '../helpers/matches.js'
import { getPackageJson } from '../helpers/package-json.js'

const [hasTypes, hasTest, useAddlicense] = await Promise.all([
  getHasTypes(),
  getHasTest(),
  getUseAddlicense(),
])

export default {
  [`*.{${SRC_EXTENSIONS.join(`,`)}}`]: [
    `tomer lint --`,
    hasTypes && `tomer typecheck --`,
    hasTest && `tomer test --findRelatedTests --no-watch`,
  ].filter(Boolean),
  '*': [`tomer format --`, useAddlicense && `addlicense`].filter(Boolean),
}

async function getUseAddlicense() {
  return (
    (await getPackageJson()).license === `Apache-2.0` &&
    (await $`which addlicense`.exitCode) === 0
  )
}
