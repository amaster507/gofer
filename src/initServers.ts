import Msg from 'ts-hl7'
import { verboseListeners } from './channelVerboseListeners'
import { events } from './events'
import { runIngestFlows } from './runIngestFlows'
import { runRoutes } from './runRoutes'
import { tcpServer } from './tcpServer'
import { InitServers } from './types'

export const initServers: InitServers = (channels) => {
  channels
    .filter((channel) => channel.source.hasOwnProperty('tcp'))
    .forEach((c) => {
      const e = events<Msg>(c.id.toString())
      verboseListeners(c.verbose ?? false, e)
      tcpServer(c, async (msg, ack) => {
        const ingestedMsg = runIngestFlows(c, msg, ack)
        const accepted = typeof ingestedMsg === 'boolean' ? false : true
        e.onIngest.go({
          pre: msg,
          post: ingestedMsg,
          accepted,
          channel: c.id.toString(),
        })
        if (ingestedMsg !== false) {
          const comp = await runRoutes(c, ingestedMsg)
          e.onComplete.go({
            orig: msg,
            channel: c.id,
            status: comp,
          })
          return comp
        }
        // NOTE: have to return true on filtered messages or else a Queue if exists will retry
        return true
      })
    })
}
