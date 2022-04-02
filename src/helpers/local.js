import { join, resolve } from 'path'
import { constants, promises as fs } from 'fs'
import { packageDirectory as getPackageDirectory } from 'pkg-dir'
import etz from 'etz'
import pMemoize from 'p-memoize'
import { $, nothrow } from './command.js'

export async function hasLocalFile(path) {
  const localPath = await fromProjectDirectory(path)

  try {
    await fs.access(localPath, constants.R_OK)
  } catch {
    return false
  }

  return true
}

export async function fromProjectDirectory(...paths) {
  return join(await getProjectDirectory(), ...paths)
}

export const getProjectDirectory = pMemoize(async () => {
  const projectDirectory =
    (await getGitDirectory()) ||
    (await getPackageDirectory()) ||
    (await getNpmPrefix())

  if (!projectDirectory) {
    etz.error(`Couldn't infer project directory`)
    process.exit(1)
  }

  return resolve(projectDirectory)
})

async function getGitDirectory() {
  return (await nothrow($`git rev-parse --show-toplevel`)).stdout.trim()
}

async function getNpmPrefix() {
  return (await nothrow($`npm prefix`)).stdout.trim()
}
