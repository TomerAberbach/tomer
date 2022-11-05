import { createTransformer } from 'babel-jest'
import babelConfig from './babel.mjs'

export default createTransformer(babelConfig)
