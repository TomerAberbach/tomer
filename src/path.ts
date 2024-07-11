import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const getPath = (...paths: string[]): string => join(__dirname, ...paths)

const __dirname = dirname(fileURLToPath(import.meta.url))
