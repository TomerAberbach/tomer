import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const directoryPath = dirname(fileURLToPath(import.meta.url))

export const getConfigPath = name => join(directoryPath, name)
