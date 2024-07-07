import { constants, promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'
import etz from 'etz'
import { globby } from 'globby'
import pMemoize from 'p-memoize'
import { packageDirectory as getPackageDirectory } from 'pkg-dir'
import { $ } from './command.js'

export const hasLocalFile = async (path: string): Promise<boolean> => {
  const localPath = await fromProjectDirectory(path)

  try {
    await fs.access(localPath, constants.R_OK)
  } catch {
    return false
  }

  return true
}

export const globLocalFiles = async (
  patterns: string | readonly string[],
): Promise<string[]> => {
  const projectDirectory = await getProjectDirectory()
  const paths = await globby(patterns, {
    cwd: projectDirectory,
    gitignore: true,
  })
  return paths.map(path => resolve(projectDirectory, path))
}

export const fromProjectDirectory = async (
  ...paths: string[]
): Promise<string> => join(await getProjectDirectory(), ...paths)

export const getProjectDirectory = pMemoize(async (): Promise<string> => {
  const projectDirectory =
    ((await getGitDirectory()) || (await getPackageDirectory())) ??
    (await getNpmPrefix())

  if (!projectDirectory) {
    etz.error(`Couldn't infer project directory`)
    process.exit(1)
  }

  return resolve(projectDirectory)
})

const getGitDirectory = async (): Promise<string> =>
  (await $`git rev-parse --show-toplevel`.nothrow()).stdout.trim()

const getNpmPrefix = async (): Promise<string> =>
  (await $`npm prefix`.nothrow()).stdout.trim()
