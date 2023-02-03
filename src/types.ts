import { StoreConfig } from 'gofer-stores'
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

export type Connection<T extends 'I' | 'O'> = T extends 'I' // TODO: if after flushing the rest of these sources/destination, possibly merge these two
  ? RequireOnlyOne<{
      tcp?: TcpConfig<T> // Listens on a TCP host/port
      // TODO: implement file reader source
      // NOTE: file source is different than the `file` store, because it will support additional methods such as ftp/sftp
      // file?: FileConfig // Read Files
      // TODO: implement db query source
      // NOTE: db source should be different than the `StoreConfig` because it should support query conditions. TBD
      // db?: StoreConfig // Queries from Store
    }>
  : RequireOnlyOne<{
      tcp?: TcpConfig<T> // Sends to a TCP host/port
      // TODO: implement file writer
      // NOTE: file destination is different than the `file` store, because it will support additional methods such as ftp/sftp
      // file?: FileConfig // Write to Files
      // TODO: db destination should be different than the `StoreConfig` because it should support query conditions and be able to set fields based upon parts of the HL7 message using paths. TBD
      // db?: StoreConfig // Persists to Store
    }>

export type AckConfig = {
  // Value to use in ACK MSH.3
  application?: string // defaults to "gofor Engine"
  // Value to use in ACK MSH.4
  organization?: string // defaults to empty string ""
  responseCode?:
    | 'AA' // Application Accept. Default
    | 'AE' // Application Error
    | 'AR' // Application Reject
  // A Store configuration to save persistent messages
  msg?: (ack: Msg, msg: Msg, filtered: boolean) => Msg // returns the ack message to send
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
  verbose?: boolean // do extra info logging.
}

export type InitServers = (channels: ChannelConfig[]) => void

export type AckFunc = (ack: Msg) => void

export type IngestFunc = (
  channel: ChannelConfig,
  msg: Msg,
  ack: AckFunc
) => Msg | false

export type RunRoutesFunc = (channel: ChannelConfig, msg: Msg) => void
