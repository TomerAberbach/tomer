import { dirname } from 'path'
import { fileURLToPath } from 'url'

const rootPath = dirname(dirname(fileURLToPath(import.meta.url)))

export default rootPath
