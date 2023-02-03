import { ChannelConfig } from './types'
import { initStores } from './initStores'
import { randomUUID } from 'crypto'
import { initServers } from './initServers'

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
  })
  initStores(channels)
  initServers(channels)
}

export default gofer
