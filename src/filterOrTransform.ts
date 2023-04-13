import Msg from 'ts-hl7'
import handelse from 'handelse'
import { IContext } from './types'
import { logger } from './helpers'

export const filterOrTransform = <T = Msg>(
  msg: T,
  filtered: boolean,
  flow: (msg: T, context: IContext) => T | boolean,
  channelId: string | number,
  flowId: string | number,
  route?: string | number
): [T, boolean] => {
  if (filtered) return [msg, filtered]
  const filteredOrMsg = flow(msg, {
    logger: logger({
      channelId,
      flowId,
      msg,
    }),
  })
  if (typeof filteredOrMsg === 'boolean') {
    if (!filteredOrMsg) {
      handelse.go(`gofer:${channelId}.onFilter`, {
        msg,
        channel: channelId,
        flow: flowId,
        route,
      })
    }
    filtered = !filteredOrMsg
  } else {
    handelse.go(`gofer:${channelId}.onTransform`, {
      pre: msg,
      post: filteredOrMsg,
      channel: channelId,
      flow: flowId,
      route,
    })
    msg = filteredOrMsg
  }
  return [msg, filtered]
}
