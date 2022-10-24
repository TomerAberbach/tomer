import { $ } from 'zx'

$.verbose = false

export const inherit = async processPromise => {
  process.stdin.pipe(processPromise.stdin)
  processPromise.stderr.pipe(process.stderr)
  processPromise.stdout.pipe(process.stdout)
  process.exit(await processPromise.exitCode)
}

export { $ } from 'zx'
