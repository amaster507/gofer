import { StoreConfig } from 'gofer-stores'
import handelse from 'handelse'
import { doAck } from './doAck'
import { filterOrTransform } from './filterOrTransform'
import { store } from './initStores'
import { FilterFlow, IngestFunc, TransformFlow } from './types'

export const runIngestFlows: IngestFunc = (channel, msg, ack) => {
  let filtered = false
  channel.ingestion.forEach((flow) => {
    const step = flow.flow
    if (typeof step === 'object') {
      if (step.kind === 'ack') {
        const ackConfig = step.ack
        const ackMsg = doAck(msg, ackConfig, filtered)
        if (typeof ack === 'function') {
          ack(ackMsg)
          handelse.go(`gofer:${channel.id}.onAck`, {
            msg,
            ack: ackMsg,
            channel: channel.id,
          })
        }
        return
      } else if (step.kind === 'filter') {
        const [m, f] = filterOrTransform(
          msg,
          filtered,
          (step as FilterFlow<'O'>).filter,
          channel.id,
          flow.id
        )
        msg = m
        filtered = f
      } else if (step.hasOwnProperty('transform')) {
        const [m, f] = filterOrTransform(
          msg,
          filtered,
          (step as TransformFlow<'O'>).transform,
          channel.id,
          flow.id
        )
        msg = m
        filtered = f
      } else {
        const storeConfig = { ...step } as StoreConfig & { kind?: 'store' }
        delete storeConfig.kind
        store(storeConfig as StoreConfig, msg)
          ?.then((res) => {
            if (res)
              return handelse.go(`gofer:${channel.id}.onLog`, {
                msg,
                log: `Stored Msg`,
                channel: channel.id,
                flow: flow.id,
              })
            return handelse.go(`gofer:${channel.id}.onError`, {
              msg,
              error: `Failed to store Msg`,
              channel: channel.id,
              flow: flow.id,
            })
          })
          .catch((error: unknown) => {
            handelse.go(`gofer:${channel.id}.onError`, {
              msg,
              error,
              channel: channel.id,
              flow: flow.id,
            })
          }) || false
      }
    } else if (typeof step === 'function') {
      const [m, f] = filterOrTransform(msg, filtered, step, channel.id, flow.id)
      msg = m
      filtered = f
    }
  })
  if (!filtered) return msg
  return false
}
