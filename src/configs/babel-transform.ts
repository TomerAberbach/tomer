import { createTransformer } from 'babel-jest'
import babelConfig from './babel.js'

const transformer: ReturnType<typeof createTransformer> =
  createTransformer(babelConfig)
export default transformer
