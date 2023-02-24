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

export type RequiredProperties<T, P extends keyof T> = Omit<T, P> &
  Required<Pick<T, P>>

interface ITcpConfig {
  host: string
  port: number
  SoM?: string // Start of Message: defaults to `Sting.fromCharCode(0x0b)`
  EoM?: string // End of Message: defaults to `String.fromCharCode(0x1c)`
  CR?: string // Carriage Return: defaults to `String.fromCharCode(0x0d)`
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

type FilterFunc = (msg: Msg) => boolean

// Returns true to pass through. Return false to filter out.
// O = require objectified filters
// F = require raw function filters
// B = allow either objectified or raw function filters
export type FilterFlow<Filt extends 'O' | 'F' | 'B' = 'B'> = Filt extends 'O'
  ? { filter: FilterFunc }
  : Filt extends 'F'
  ? FilterFunc
  : FilterFunc | { filter: FilterFunc }

type TransformFunc = (msg: Msg) => Msg

// O = require objectified transformers
// F = require raw function transformers
// B = allow either objectified or raw function transformers
export type TransformFlow<Tran extends 'O' | 'F' | 'B' = 'B'> = Tran extends 'O'
  ? { transform: TransformFunc }
  : Tran extends 'F'
  ? TransformFunc
  : TransformFunc | { transform: TransformFunc }

// O = require objectified filters/transformers
// F = require raw function filters/transformers
// B = allow either objectified or raw function filters/transformers
export type IngestionFlow<
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B'
> = { ack: AckConfig } | FilterFlow<Filt> | TransformFlow<Tran> | StoreConfig

// O = require objectified filters/transformers
// F = require raw function filters/transformers
// B = allow either objectified or raw function filters/transformers
export type Ingestion<
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B'
> = {
  id?: string | number // a unique id for this ingestion flow. If not provided will use UUID to generate. if not defined it may not be the same between deployments/reboots
  name?: string // a human readable name for this ingestion flow. Preferrably unique
  tags?: Tag[] // Tags to help organize/identify ingestion flows
  flow: IngestionFlow<Filt, Tran>
}

// O = require objectified filters/transformers
// F = require raw function filters/transformers
// B = allow either objectified or raw function filters/transformers
export type RouteFlow<
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B'
> = FilterFlow<Filt> | TransformFlow<Tran> | StoreConfig | Connection<'O'>

// O = require objectified filters/transformers
// F = require raw function filters/transformers
// B = allow either objectified or raw function filters/transformers
export type RouteFlowNamed<
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B'
> = {
  id?: string | number // a unique id for this route flow. If not provided will use UUID to generate. if not defined it may not be the same between deployments/reboots
  name?: string // a human readable name for this route flow. Preferrably unique
  tags?: Tag[] // Tags to help organize/identify route flows
  flow: RouteFlow<Filt, Tran>
}

// O = require objectified filters/transformers
// F = require raw function filters/transformers
// B = allow either objectified or raw function filters/transformers
// Stct = strict mode. If 'S' then everything must be objectified with ids. If 'L' then allow loose.
export type Route<
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B',
  Stct extends 'S' | 'L' = 'L'
> = {
  id?: string | number // a unique id for this route flow. If not provided will use UUID to generate. if not defined it may not be the same between deployments/reboots
  name?: string // a human readable name for this route flow. Preferrably unique
  tags?: Tag[] // Tags to help organize/identify route flows
  flows: Stct extends 'S'
    ? RequiredProperties<RouteFlowNamed<Filt, Tran>, 'id'>[]
    : (RouteFlow<Filt, Tran> | RouteFlowNamed<Filt, Tran>)[]
}

// Filt(er) & Tran(sformer)
// O = require objectified filters/transformers
// F = require raw function filters/transformers
// B = allow either objectified or raw function filters/transformers
// Stct = strict mode. If 'S' then everything must be objectified with ids. If 'L' then allow loose.
export interface ChannelConfig<
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B',
  Stct extends 'S' | 'L' = 'L'
> {
  id?: string | number // a unique id for this channel. If not provided will use UUID to generate. if not defined it may not be the same between deployments/reboots
  name: string // a name, preferrably unique, to identify this channel later on
  tags?: Tag[] // Tags to help organize/identify channels
  source: Connection<'I'>
  ingestion: Stct extends 'S'
    ? RequiredProperties<Ingestion<Filt, Tran>, 'id' | 'flow'>[]
    : (IngestionFlow<Filt, Tran> | Ingestion<Filt, Tran>)[]
  routes?: Stct extends 'S'
    ? RequiredProperties<Route<Filt, Tran, 'S'>, 'id' | 'flows'>[]
    : (
        | (RouteFlow<Filt, Tran> | RouteFlowNamed<Filt, Tran>)[]
        | Route<Filt, Tran>
      )[]
  verbose?: boolean // do extra info logging.
}

export type InitServers = <
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B'
>(
  channels: ChannelConfig<Filt, Tran, 'S'>[]
) => void

export type AckFunc = (ack: Msg) => void

export type IngestFunc = <
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B'
>(
  channel: ChannelConfig<Filt, Tran, 'S'>,
  msg: Msg,
  ack: AckFunc
) => Msg | false

export type RunRoutesFunc = <
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B'
>(
  channel: ChannelConfig<Filt, Tran, 'S'>,
  msg: Msg
) => Promise<boolean>

export type RunRouteFunc = (route: RouteFlow[], msg: Msg) => Promise<boolean>
