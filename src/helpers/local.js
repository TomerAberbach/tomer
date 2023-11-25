import { constants, promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'
import etz from 'etz'
import { globby } from 'globby'
import pMemoize from 'p-memoize'
import { packageDirectory as getPackageDirectory } from 'pkg-dir'
import { $ } from './command.js'

export const hasLocalFile = async path => {
  const localPath = await fromProjectDirectory(path)

  try {
    await fs.access(localPath, constants.R_OK)
  } catch {
    return false
  }

  return true
}

export const globLocalFiles = async patterns =>
  globby(patterns, { cwd: await getProjectDirectory(), gitignore: true })

export const fromProjectDirectory = async (...paths) =>
  join(await getProjectDirectory(), ...paths)

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

const getGitDirectory = async () =>
  (await $`git rev-parse --show-toplevel`.nothrow()).stdout.trim()

const getNpmPrefix = async () => (await $`npm prefix`.nothrow()).stdout.trim()
