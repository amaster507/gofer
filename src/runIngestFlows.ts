import { StoreConfig } from 'gofer-stores'
import Msg from 'ts-hl7'
import { store } from './initStores'
import { AckConfig, FilterFlow, IngestFunc, TransformFlow } from './types'

const filterOrTransform = (
  msg: Msg,
  filtered: boolean,
  flow: (msg: Msg) => boolean | Msg
): [msg: Msg, filtered: boolean] => {
  const filteredOrMsg = flow(msg)
  if (typeof filteredOrMsg === 'boolean') {
    filtered = !filteredOrMsg
  } else {
    msg = filteredOrMsg
  }
  return [msg, filtered]
}

export const runIngestFlows: IngestFunc = (channel, msg, ack) => {
  let filtered = false
  channel.ingestion.forEach((flow) => {
    const step = flow.flow
    if (typeof step === 'object') {
      if (step.hasOwnProperty('ack')) {
        const ackConfig = (step as { ack: AckConfig }).ack as AckConfig
        const app = ackConfig.application ?? 'gofer ENGINE'
        const org = ackConfig.organization ?? ''
        const res = ackConfig.responseCode ?? 'AA'
        const id = msg.get('MSH-10.1')
        const now = new Date()
          .toUTCString()
          .replace(/[^0-9]/g, '')
          .slice(0, -3)
        const ackMsg = new Msg(
          `MSH|^~\\&|${app}|${org}|||${now}||ACK|${id}|P|2.5.1|\nMSA|${res}|${id}`
        )
        ack(
          typeof ackConfig.msg === 'function'
            ? ackConfig.msg(ackMsg, msg, filtered)
            : ackMsg
        )
        return
      } else if (step.hasOwnProperty('filter')) {
        if (filtered) {
          return
        }
        const [m, f] = filterOrTransform(
          msg,
          filtered,
          (step as FilterFlow<'O'>).filter
        )
        msg = m
        filtered = f
      } else if (step.hasOwnProperty('transform')) {
        if (filtered) {
          return
        }
        const [m, f] = filterOrTransform(
          msg,
          filtered,
          (step as TransformFlow<'O'>).transform
        )
        msg = m
        filtered = f
      } else {
        const storeConfig = step as StoreConfig
        store(storeConfig, msg)
      }
    } else if (typeof step === 'function') {
      if (filtered) {
        return
      }
      const [m, f] = filterOrTransform(msg, filtered, step)
      msg = m
      filtered = f
    }
  })
  if (!filtered) return msg
  return false
}
