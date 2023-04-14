import handelse from 'handelse'
import { ChannelConfig } from './types'
import { SubFunc, SubscriberID } from 'handelse/dist/types/types'
import { IChannelEvents } from './events'
import Msg from 'ts-hl7'

export const onError = handelse.global<Error>('gofer:error')
onError.do((error) => {
  console.error(`${new Date().toISOString()}: [ERROR]`, error)
  return true
})
export const throwError = onError.pub

export const onLog = handelse.global<unknown>('gofer:log')
onLog.do((log) => {
  console.log(`${new Date().toISOString()}:`, log)
  return true
})
export const log = (...props: unknown[]) => {
  onLog.pub(props)
}

export const onGoferStart = handelse.global<Date>('gofer:start')

export const preChannelInit =
  handelse.global<ChannelConfig>('gofer:channel:init')

export const publishers = {
  onGoferStart: onGoferStart.pub,
  preChannelInit: preChannelInit.pub,
  onError: onError.pub,
  onLog: onLog.pub,
}

type TListeners = {
  onGoferStart: (handler: SubFunc<Date>) => SubscriberID
  preChannelInit: (handler: SubFunc<ChannelConfig>) => SubscriberID
  onError: (handler: SubFunc<Error>) => SubscriberID
  onLog: (handler: SubFunc<unknown>) => SubscriberID
  channels: Record<string, IChannelEvents<Msg>>
}

export const listeners: TListeners = {
  onGoferStart: onGoferStart.sub,
  preChannelInit: preChannelInit.sub,
  onError: onError.sub,
  onLog: onLog.sub,
  channels: {},
}

export default {
  publishers,
  listeners,
}
