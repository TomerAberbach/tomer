import etz from 'etz'
import { asConcur, mapConcur, orConcur, pipe, reduceConcur, toMax } from 'lfi'
import type { ProcessPromise } from 'zx'
import { $ } from 'zx'

$.verbose = false
$.quiet = true
$.log = entry => {
  switch (entry.kind) {
    case `cd`:
      etz.debug(`cd ${entry.dir}`)
      break
    case `cmd`:
      etz.debug(entry.cmd)
      break
    case `custom`:
    case `fetch`:
    case `retry`:
    case `stderr`:
    case `stdout`:
      break
  }
}

export const inherit = async (
  processPromises: ProcessPromise | ProcessPromise[],
): Promise<void> => {
  // eslint-disable-next-line typescript/no-floating-promises
  processPromises = [processPromises].flat()

  for (const processPromise of processPromises) {
    processPromise.stderr.pipe(process.stderr)
    processPromise.stdout.pipe(process.stdout)
  }

  process.exit(
    await pipe(
      asConcur(processPromises),
      mapConcur(async processPromise => (await processPromise.exitCode) ?? 0),
      reduceConcur(toMax()),
      orConcur(() => 0),
    ),
  )
}

export { $ } from 'zx'
