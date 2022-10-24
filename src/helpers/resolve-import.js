import { fileURLToPath } from 'url'
import { resolve as importMetaResolve } from 'import-meta-resolve'

const resolveImport = async (specifier, parent) =>
  fileURLToPath(await importMetaResolve(specifier, parent))

export default resolveImport
