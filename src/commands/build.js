import { join } from 'path'
import { rollup } from 'rollup'
import { terser } from 'rollup-plugin-terser'
import externals from 'rollup-plugin-node-externals'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import maxmin from 'maxmin'

export const command = `build <entry>`

export const builder = yargs =>
  yargs
    .positional(`entry`, {
      type: `string`,
      description: `entry point to build`,
    })
    .option(`deps`, {
      alias: `d`,
      type: `boolean`,
      default: false,
      description: `build dependencies`,
    })
    .options(`formats`, {
      alias: `f`,
      type: `string`,
      choices: [`esm`, `cjs`, `esm,cjs`, `cjs,esm`],
      default: `esm`,
      coerce: formats => formats.split(`,`),
    })
    .option(`out`, {
      alias: `o`,
      type: `string`,
      description: `output directory`,
    })

export const description = `Builds the code`

export const handler = async ({
  entry,
  deps,
  formats,
  out,
  projectDirectoryPath,
  packageJson,
}) => {
  let initialSize = 0
  const output = new Map()

  const bundle = await rollup({
    input: entry,
    plugins: [
      deps && nodeResolve(),
      {
        name: `compute-size`,
        transform(code) {
          initialSize += code.length
          return code
        },
        generateBundle({ format }, bundle) {
          output.set(
            format === `es` ? `esm` : `cjs`,
            Object.values(bundle).find(({ isEntry }) => isEntry).code,
          )
        },
      },
      externals({ deps: !deps }),
      terser(packageJson.terser || {}),
    ],
  })

  out = out || join(projectDirectoryPath, `dist`)

  await Promise.all(
    formats.map(format =>
      bundle.write({
        file: join(out, `index.${format === `cjs` ? `cjs` : `js`}`),
        format,
      }),
    ),
  )

  for (const format of formats) {
    console.log(`${format}: ${maxmin(initialSize, output.get(format), true)}`)
  }
}
