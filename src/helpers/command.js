import { asConcur, mapConcur, orConcur, pipe, reduceConcur, toMax } from 'lfi'
import { $ } from 'zx'

$.verbose = false
$.quiet = true

export const inherit = async processPromises => {
  processPromises = [processPromises].flat()

  if (processPromises.length === 1) {
    process.stdin.pipe(processPromises[0].stdin)
  }

  for (const processPromise of processPromises) {
    processPromise.stderr.pipe(process.stderr)
    processPromise.stdout.pipe(process.stdout)
  }

  process.exit(
    await pipe(
      asConcur(processPromises),
      mapConcur(processPromise => processPromise.exitCode),
      reduceConcur(toMax()),
      orConcur(() => 0),
    ),
  )
}

export { $ } from 'zx'
