import { StoreOptions } from 'gofer-stores'
import Msg from 'ts-hl7'

type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Record<Exclude<Keys, K>, undefined>>
  }[Keys]

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

interface ITcpConfig {
  host: string
  port: number
}

export type StoreConfig = RequireOnlyOne<{
  file: StoreOptions['file']
  surreal: StoreOptions['surreal']
}>

interface Queue {
  interval?: number
  limit?: number
  rotate?: boolean
  storage?: StoreConfig
}

export type TcpConfig<T extends 'I' | 'O' = 'I'> = T extends 'I'
  ? ITcpConfig
  : ITcpConfig & {
      queue?: boolean | number | Queue
      responseTimeout?: number | false
    }

interface IFileConfig {
  directory: string
  ftp?: string
  sftp?: string
  filenamePattern?: string
  includeAllSubDirs?: boolean
  ignoreDotFiles?: boolean
  username?: boolean
  password?: boolean
  timeout?: number
  deleteAfterRead?: boolean
  moveAfterRead?: {
    directory: string
    filename: string
  }
  moveAfterError?: {
    directory: string
    filename: string
  }
  checkFileAge?: number
  limitSize?: RequireAtLeastOne<{
    min?: number
    max?: number
  }>
}

export type FileConfig = RequireOnlyOne<
  IFileConfig,
  'ftp' | 'sftp' | 'directory'
>

export type Connection<T extends 'I' | 'O'> = RequireOnlyOne<{
  tcp?: TcpConfig<T> // Listens/Sends on/to a TCP host/port
  // file?: FileConfig // Read/Write Files
  db?: StoreConfig // Queries/Mutates from/to Store
}>

export type AckConfig = {
  // Value to use in ACK MSH.3
  application?: string // defaults to "gofor Engine"
  // Value to use in ACK MSH.4
  organization?: string // defaults to empty string ""
  // A Store configuration to save persistent messages
  msg?: (ack: Msg, msg: Msg) => Msg // returns the ack message to send
}

interface Tag {
  name: string
  color?: string // a valid hexidecimal color string or valid CSS color name
}

type FilterFlow = (msg: Msg) => boolean

type TransformFlow = (msg: Msg) => Msg

type IngestionFlow =
  | { ack: AckConfig }
  | FilterFlow
  | TransformFlow
  | StoreConfig

type RouteFlow = IngestionFlow | Connection<'O'>

export interface ChannelConfig {
  id?: string | number // a unique id for this channel. If not provided will use UUID to generate. if not defined it may not be the same between deployments/reboots
  name: string // a name, preferrably unique, to identify this channel later on
  tags?: Tag[] // Tags to help organize/identify channels
  source: Connection<'I'>
  ingestion: IngestionFlow[]
  routes?: RouteFlow[][]
}
