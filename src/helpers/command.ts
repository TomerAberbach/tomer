import { asConcur, mapConcur, orConcur, pipe, reduceConcur, toMax } from 'lfi'
import type { ProcessPromise } from 'zx'
import { $ } from 'zx'

$.verbose = false
$.quiet = true

export const inherit = async (
  processPromises: ProcessPromise | ProcessPromise[],
): Promise<void> => {
  // eslint-disable-next-line typescript/no-floating-promises
  processPromises = [processPromises].flat()

  if (processPromises.length === 1) {
    process.stdin.pipe(processPromises[0]!.stdin)
  }

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
