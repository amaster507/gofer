import { StoreConfig } from 'gofer-stores'
import Msg from 'ts-hl7'
import { doAck } from './doAck'
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
        const ackMsg = doAck(msg, ackConfig, filtered)
        if (typeof ack === 'function') ack(ackMsg)
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
        const storeConfig = { ...step } as StoreConfig & { kind?: 'store' }
        delete storeConfig.kind
        store(storeConfig as StoreConfig, msg)
          ?.then((res) =>
            console.log(
              `${res ? 'Stored' : 'Failed to store'} msg: ${msg.get('MSH-10')}`
            )
          )
          .catch((e) => {
            console.warn('Failed to store msg: ' + msg.get('MSH-10'))
            console.warn(e)
          }) || false
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
