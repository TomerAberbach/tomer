import { $ } from 'zx'

$.verbose = false

export async function inherit(processPromise) {
  process.stdin.pipe(processPromise.stdin)
  processPromise.stderr.pipe(process.stderr)
  processPromise.stdout.pipe(process.stdout)
  process.exit(await processPromise.exitCode)
}

export { $ }
