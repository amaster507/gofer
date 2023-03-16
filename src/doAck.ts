import Msg from 'ts-hl7'
import { AckConfig } from './types'

export const doAck = (
  msg: Msg,
  ackConfig: AckConfig = {},
  filtered = false
) => {
  const app = ackConfig.application ?? 'gofer ENGINE'
  const org = ackConfig.organization ?? ''
  const res = ackConfig.responseCode ?? 'AA'
  const txt = ackConfig.text ?? ''
  const id = msg.get('MSH-10.1')
  const now = new Date()
    .toUTCString()
    .replace(/[^0-9]/g, '')
    .slice(0, -3)
  let ackMsg = new Msg(
    `MSH|^~\\&|${app}|${org}|||${now}||ACK|${id}|P|2.5.1|\nMSA|${res}|${id}${
      txt ? `|${txt}` : ''
    }`
  )
  if (typeof ackConfig.msg === 'function')
    ackMsg = ackConfig.msg(ackMsg, msg, filtered)
  return ackMsg
}
