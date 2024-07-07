import type { CommandModule as RawCommandModule } from 'yargs'

export type CommandModule = RawCommandModule<
  Record<string, never>,
  { _: string[]; '--': string[] }
>
