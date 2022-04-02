import babelJest from 'babel-jest'
import babelConfig from './babel.mjs'

export default babelJest.default.createTransformer(babelConfig)
