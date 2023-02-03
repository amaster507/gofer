import { runIngestFlows } from './runIngestFlows'
import { runRoutes } from './runRoutes'
import { tcpServer } from './tcpServer'
import { InitServers } from './types'

export const initServers: InitServers = (channels) => {
  channels
    .filter((channel) => channel.source.hasOwnProperty('tcp'))
    .forEach((c) => {
      tcpServer(c, (msg, ack) => {
        const ingestedMsg = runIngestFlows(c, msg, ack)
        if (ingestedMsg !== false) runRoutes(c, ingestedMsg)
      })
    })
}
