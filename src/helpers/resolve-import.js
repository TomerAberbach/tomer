import { resolve as importMetaResolve } from 'import-meta-resolve'
import { fileURLToPath } from 'url'

const resolveImport = (specifier, parent) =>
  fileURLToPath(importMetaResolve(specifier, parent))

export default resolveImport
