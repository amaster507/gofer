import handelse from 'handelse'
import { ChannelConfig } from './types'

export const onError = handelse.global<Error>('gofer:error')
onError.do((error) => {
  console.error(`${new Date().toISOString}: [ERROR]`, error)
  return true
})

export const onLog = handelse.global<unknown>('gofer:error')
onLog.do((log) => {
  console.log(`${new Date().toISOString}:`, log)
  return true
})

export const onGoferStart = handelse.global<Date>('gofer:start')

export const preChannelInit =
  handelse.global<ChannelConfig>('gofer:channel:init')

export const publishers = {
  onGoferStart: onGoferStart.pub,
  preChannelInit: preChannelInit.pub,
  onError: onError.pub,
  onLog: onLog.pub,
}

export const listeners = {
  onGoferStart: onGoferStart.sub,
  preChannelInit: preChannelInit.sub,
  onError: onError.sub,
  onLog: onLog.sub,
}

export default {
  publishers,
  listeners,
}
