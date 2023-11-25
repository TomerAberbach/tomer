import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { npmRunPathEnv } from 'npm-run-path'

if (!(`NO_COLOR` in process.env) && !(`FORCE_COLOR` in process.env)) {
  process.env.FORCE_COLOR = `1`
}

process.env = npmRunPathEnv({ cwd: dirname(fileURLToPath(import.meta.url)) })
