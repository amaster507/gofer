// FIXME: enable eslint
/* eslint-disable */

import config from './channels'
import { ChannelConfig } from './types'
import { initStores } from './initStores'
import { randomUUID } from 'crypto'
import { initServers } from './initServers'

export const gofer = async (channels: ChannelConfig[]): Promise<void> => {
  channels.forEach((channel) => {
    if (!channel.id) {
      channel.id = randomUUID()
      console.log(`Channel "${channel.name}" config did not define an \`id\`. Assigned: "${channel.id}"`)
    }
    // TODO: implement db source
    if (channel.source.hasOwnProperty('db')) {
      throw Error(`Channel "${channel.name}"(${channel.id}) tried to use a \`db\` in the source. DB sources are not yet supported`)
    }
    // TODO: implement file reader source
    if (channel.source.hasOwnProperty('file')) {
      throw Error(`Channel "${channel.name}"(${channel.id}) tried to use a \`file\` in the source. File reader sources are not yet supported`)
    }
  })

  initStores(channels)

  initServers(channels)



  //       /**
  //        * TODO: Work Ingestion flows here
  //        */
  //       console.log('TODO: Implement Ingestion', JSON.stringify(c.ingestion))

  //       /**
  //        * TODO: Work Routes here
  //        */
  //       console.log('TODO: Implement Routes', JSON.stringify(c.routes))

  //       /**
  //        * FIXME: if flow is store, then store the message
  //        */
  //       // db?.store?.(msg)

  //       /**
  //        * FIXME: c.organization no longer exists
  //        * TODO: if flow is ack, then send out an ack response
  //        */

  //       // const _id = msg.get('MSH-10')

  //       // const name = c.name.match(/^\$[A-Z][A-Z0-9]{2}/)
  //       //   ? (msg.get(c.name.slice(1)) as string) || c.name
  //       //   : c.name

  //       // const organization = c.organization.match(/^\$[A-Z][A-Z0-9]{2}/)
  //       //   ? (msg.get(c.organization.slice(1)) as string) || c.organization
  //       //   : c.organization
  //       // let res: 'AA' | 'AE' | 'AR' = 'AE' // AR = Application Accept, AE = Application Error, AR = Application Reject
  //       // if (typeof _id === 'string') {
  //       //   res = 'AA'
  //       // } else {
  //       //   res = 'AR'
  //       // }
  //       // const ack = `MSH|^~\\&|${name}|${organization}|||${new Date()
  //       //   .toUTCString()
  //       //   .replace(/[^0-9]/g, '')
  //       //   .slice(0, -3)}||ACK|${_id}|P|2.5.1|\nMSA|${res}|${_id}`
  //       // socket.write('\u000b' + ack + '\u001c\r')
  //     })

  //     socket.on('close', (data) => {
  //       if (c.verbose)
  //         console.log(
  //           `Client ${clientAddress} disconnected`,
  //           `data: ${JSON.stringify(data)}`
  //         )
  //     })
  //   })
  // })
}

// export default gofer

gofer(config)
