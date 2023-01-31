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

export interface ServerConfig {
  // The receiving server host name/ip
  host: string
  // The receiving server port
  port: number
  // Value to use in ACK MSH.3
  name: string
  // Value to use in ACK MSH.4
  organization: string
  // A Store configuration to save persistent messages
  store?: StoreConfig
  // TODO: add support for outbound connections including filters, transformers, and destinations
  route?: ServerRoute[]
}

export type StoreConfig = RequireOnlyOne<{
  file: StoreOptions['file']
  surreal: StoreOptions['surreal']
}>

// FIXME: Support different type of routes not just TCP
interface ServerRoute {
  // The destination server host name/ip
  host: string
  // The destination server port
  port: number
  // Filters, Transformers, and Stores to apply to the message
  // These will get applied sequentially.
  flows?: (FilterFlow | TransformFlow | StoreConfig)[]
  // Whether or not to wait for the previous Route to complete before starting this one.
  // Ignored on first Route
  wait?: boolean
  // Whether to use original message or final message from previous Route
  // Ignored on first Route
  // Defaults to true
  useOriginal?: boolean
  // Whether to queue messages to the destination or just drop them
  // TODO: add support for queueing. Need more options for this, TBD
  queue?: boolean
}

type FilterFlow = (msg: Msg) => boolean

type TransformFlow = (msg: Msg) => Msg
