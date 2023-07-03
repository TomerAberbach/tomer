import { gitignoreToMinimatch } from '@humanwhocodes/gitignore-to-minimatch'
import eslintConfig from '@tomer/eslint-config'
import fs from 'fs/promises'
import { filter, map, pipe, reduce, toArray } from 'lfi'
import { fromProjectDirectory, hasLocalFile } from '../helpers/local.js'

export default [
  ...eslintConfig,
  (await hasLocalFile(`.gitignore`)) && {
    ignores: pipe(
      (
        await fs.readFile(await fromProjectDirectory(`.gitignore`), `utf8`)
      ).split(/\r?\n/gu),
      map(line => line.trim()),
      filter(line => line.length > 0 && !line.startsWith(`#`)),
      map(gitignoreToMinimatch),
      reduce(toArray()),
    ),
  },
].filter(Boolean)
