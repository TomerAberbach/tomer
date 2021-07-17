import { join } from 'path'
import { rollup } from 'rollup'
import { terser } from 'rollup-plugin-terser'
import externals from 'rollup-plugin-node-externals'

export const command = `build <entry>`

export const builder = yargs =>
  yargs.positional(`entry`, {
    type: `string`,
    description: `entry point to build`,
  })

export const description = `Builds the code`

export const handler = async ({ entry, projectDirectoryPath, packageJson }) => {
  const bundle = await rollup({
    input: entry,
    plugins: [externals({ deps: true }), terser(packageJson.terser || {})],
  })

  await bundle.write({
    file: join(projectDirectoryPath, `dist/index.js`),
    format: `esm`,
  })
}
