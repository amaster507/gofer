import { ChannelConfig } from './types'
import { initStores } from './initStores'
import { initServers } from './initServers'
import { apiServer } from './api'
import State from './state'
import gql from './api/gql'
import { coerceStrictTypedChannels } from './helpers'

const state = new State({})

const gofer = async (channels: ChannelConfig[]): Promise<void> => {
  initServers(
    initStores(
      coerceStrictTypedChannels(channels).map((channel) => {
        state.addChannel(channel)
        return channel
      })
    )
  )
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
