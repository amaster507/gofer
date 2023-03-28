import handelse from 'handelse'
import Msg from 'ts-hl7'
import { ChannelConfig } from './types'

export const onError = handelse.global<Error>('gofer:error')
export const onGoferStart = handelse.global<Date>('gofer:start')
export const preChannelInit =
  handelse.global<ChannelConfig>('gofer:channel:init')
export const preMessage =
  handelse.global<[channelID: string, msg: Msg]>('gofer:message:pre')
export const postMessage =
  handelse.global<[channelID: string, msg: Msg]>('gofer:message:post')
export const filteredMessage = handelse.global<[channelID: string, msg: Msg]>(
  'gofer:message:filtered'
)

export const publishers = {
  onGoferStart: onGoferStart.pub,
  preChannelInit: preChannelInit.pub,
  onError: onError.pub,
}

export const listeners = {
  onGoferStart: onGoferStart.sub,
  preChannelInit: preChannelInit.sub,
  onError: onError.sub,
}

export default {
  publishers,
  listeners,
}
