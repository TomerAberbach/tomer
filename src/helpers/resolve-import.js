import { fileURLToPath } from 'node:url'
import { resolve as importMetaResolve } from 'import-meta-resolve'

const resolveImport = (specifier, parent) =>
  fileURLToPath(importMetaResolve(specifier, parent))

export default resolveImport
