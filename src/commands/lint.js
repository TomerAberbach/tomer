import { resolve } from 'path'
import { promises as fs } from 'fs'
import { ESLint } from 'eslint'
import { globby } from 'globby'
import prettier from 'prettier'
import {
  asConcur,
  pipe,
  flatMap,
  join,
  map,
  flatMapConcur,
  collectConcur,
  toArray,
} from 'lfi'
import commandExists from 'command-exists'
import { exec } from '../util.js'
import prettierConfig from '../configs/prettier.js'
import eslintConfig from '../configs/eslint.js'

export const command = `lint [globs..]`

export const description = `Lints and formats files`

export const builder = yargs =>
  yargs
    .positional(`globs`, {
      type: `string`,
      description: `glob patterns of files to lint`,
    })
    .default(
      `globs`,
      () => {
        const supportedFilenames = pipe(
          prettier.getSupportInfo().languages,
          flatMap(({ filenames = [] }) => filenames),
          join(`,`),
        )
        const supportedExtensions = pipe(
          prettier.getSupportInfo().languages,
          flatMap(({ extensions = [] }) => extensions),
          map(extension => extension.substring(1)),
          join(`,`),
        )
        return [`**/{${supportedFilenames},*.{${supportedExtensions}}}`]
      },
      `**/*`,
    )
    .option(`google`, {
      alias: `g`,
      type: `boolean`,
      default: false,
      description: `add Google license`,
    })

const eslint = new ESLint({
  baseConfig: eslintConfig,
  errorOnUnmatchedPattern: false,
  fix: true,
  globInputPaths: false,
  useEslintrc: false,
})

const expandGlobs = globs =>
  globby(globs, {
    ignore: [`**/node_modules/**`, `**/fixtures/**`, `**/pnpm-lock.yaml`],
    gitignore: true,
  })

const getFileMetadata = async filename => {
  const { inferredParser } = await prettier.getFileInfo(filename)
  return inferredParser == null
    ? []
    : [
        {
          filename: resolve(process.cwd(), filename),
          parser: inferredParser,
        },
      ]
}

const lintFile = async ({ filename, parser }) => {
  // Read
  const originalSource = await fs.readFile(filename, `utf8`)
  let source = originalSource

  const results = []

  try {
    // Lint
    if (parser === `babel`) {
      const [result] = await eslint.lintText(source, { filePath: filename })
      const { output = source } = result
      source = output

      results.push(result)
    }

    // Format
    source = prettier.format(source, {
      ...prettierConfig,
      parser,
    })
  } catch {
    console.warn(`Couldn't lint ${filename}`)
  }

  if (source !== originalSource) {
    // Write
    await fs.writeFile(filename, source)
  }

  // Report
  return results
}

const lint = filenames =>
  pipe(
    asConcur(filenames),
    flatMapConcur(getFileMetadata),
    flatMapConcur(lintFile),
    collectConcur(toArray),
  )

export const handler = async ({ globs, google }) => {
  const filenames = await expandGlobs(globs)

  if (google && (await commandExists(`addlicense`))) {
    await exec(`addlicense`, filenames)
  }

  const [formatter, results] = await Promise.all([
    eslint.loadFormatter(`eslint-formatter-pretty`),
    lint(filenames),
  ])

  const output = formatter.format(results)

  if (output.length === 0) {
    return
  }

  process.stdout.write(output)
  process.exit(1)
}
