import { state } from '.'
import { coerceStrictTypedChannels } from './helpers'
import { initServers } from './initServers'
import { initStores } from './initStores'
import { ChannelConfig } from './types'

export const gofer = async (channels: ChannelConfig[]): Promise<void> => {
  initServers(
    initStores(
      coerceStrictTypedChannels(channels).map((channel) => {
        state.addChannel(channel)
        return channel
      })
    )
  )
}
