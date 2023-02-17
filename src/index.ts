import { ChannelConfig } from './types'
import { initStores } from './initStores'
import { randomUUID } from 'crypto'
import { initServers } from './initServers'
import { apiServer } from './api'
import State from './state'
import gql from './api/gql'

const state = new State({})

const gofer = async (channels: ChannelConfig[]): Promise<void> => {
  channels.forEach((channel) => {
    if (!channel.id) {
      channel.id = randomUUID()
      console.log(
        `Channel "${channel.name}" config did not define an \`id\`. Assigned: "${channel.id}"`
      )
    }
    // TODO: implement db source
    if (channel.source.hasOwnProperty('db')) {
      throw Error(
        `Channel "${channel.name}"(${channel.id}) tried to use a \`db\` in the source. DB sources are not yet supported`
      )
    }
    // TODO: implement file reader source
    if (channel.source.hasOwnProperty('file')) {
      throw Error(
        `Channel "${channel.name}"(${channel.id}) tried to use a \`file\` in the source. File reader sources are not yet supported`
      )
    }
    // state.addChannel(
    //   channel.id.toString(),
    //   channel.ingestion.map(() => true),
    //   channel.routes?.map((c) => c.map(() => true)) ?? [],
    //   channel.verbose
    // )
  })
  initStores(channels)
  initServers(channels)
}

apiServer(async (req) => {
  const res = await new gql(JSON.parse(req.body), state).res()
  return {
    protocol: req.protocol,
    headers: new Map([['Content-Type', 'application/json']]),
    statusCode: 200,
    status: 'OK',
    body: JSON.stringify(res),
  }
})

export default gofer
