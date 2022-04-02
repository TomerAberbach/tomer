import { fileURLToPath } from 'url'
import { resolve as importMetaResolve } from 'import-meta-resolve'

export default async function resolveImport(specifier, parent) {
  return fileURLToPath(await importMetaResolve(specifier, parent))
}
