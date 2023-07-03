import { npmRunPathEnv } from 'npm-run-path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

if (!(`NO_COLOR` in process.env) && !(`FORCE_COLOR` in process.env)) {
  process.env.FORCE_COLOR = `1`
}

process.env = npmRunPathEnv({ cwd: dirname(fileURLToPath(import.meta.url)) })
