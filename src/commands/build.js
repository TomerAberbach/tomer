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

export const description = `Builds the code`

export const handler = async ({
  entry,
  deps,
  projectDirectoryPath,
  packageJson,
}) => {
  let initialSize = 0
  let output

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
        generateBundle(options, bundle) {
          output = Object.values(bundle).find(({ isEntry }) => isEntry).code
        },
      },
      externals({ deps: !deps }),
      terser(packageJson.terser || {}),
    ],
  })

  await bundle.write({
    file: join(projectDirectoryPath, `dist/index.js`),
    format: `esm`,
  })

  console.log(maxmin(initialSize, output, true))
}
