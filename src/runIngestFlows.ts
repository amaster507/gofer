import { StoreConfig } from 'gofer-stores'
import Msg from 'ts-hl7'
import { store } from './initStores'
import { AckConfig, IngestFunc } from './types'

export const runIngestFlows: IngestFunc = (channel, msg, ack) => {
  let filtered = false
  channel.ingestion.forEach((flow) => {
    if (typeof flow === 'object') {
      if (flow.hasOwnProperty('ack')) {
        const ackConfig = (flow as { ack: AckConfig }).ack as AckConfig
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
      } else {
        const storeConfig = flow as StoreConfig
        store(storeConfig, msg)
      }
    } else if (typeof flow === 'function') {
      if (filtered) {
        return
      }
      const filteredOrMsg = flow(msg)
      if (typeof filteredOrMsg === 'boolean') {
        filtered = !filteredOrMsg
      } else {
        msg = filteredOrMsg
      }
    }
  })
  if (!filtered) return msg
  return false
}
