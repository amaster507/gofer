import net from 'net'
import Msg from 'ts-hl7'
import { AckFunc, ChannelConfig } from './types'

export const tcpServer = <
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B'
>(
  channel: ChannelConfig<Filt, Tran, 'S'>,
  ingestMessage: (msg: Msg, ack: AckFunc) => Msg | void
) => {
  const {
    host,
    port,
    SoM = '\x0B',
    EoM = '\x1C',
    CR = '\r',
  } = channel.source.tcp
  const server = net.createServer({ allowHalfOpen: false })
  server.listen(port, host, () => {
    if (channel.verbose)
      console.log(
        `${channel.name}(${channel.id}) Server listening on ${host}:${port}`
      )
  })
  server.on('connection', (socket) => {
    socket.setEncoding('utf8')

    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`
    if (channel.verbose)
      console.log(`New client connection from ${clientAddress}`)

    const data: Record<string, string> = {}

    socket.on('data', (packet) => {
      if (channel.verbose)
        console.log(`Received Data from Client ${clientAddress}:`)
      let hl7 = packet.toString()
      const f = hl7[0]
      const e = hl7[hl7.length - 1]
      const l = hl7[hl7.length - 2]
      // if beginning of a message and there is an existing partial message, then delete it
      if (f === SoM && data?.[clientAddress] !== undefined) {
        if (channel.verbose)
          console.log(
            `MESSAGE LOSS: Partial message removed from ${clientAddress}`
          )
        delete data[clientAddress]
      }
      // if end of a message then see if there is a partial message to append it to.
      if (e === CR && l === EoM) {
        hl7 = hl7.slice(0, -2)
        if (f === SoM) {
          hl7 = hl7.slice(1)
        } else {
          hl7 = (data?.[clientAddress] || '') + hl7.slice(0, -2)
          delete data[clientAddress]
        }
        // else must not be the end of the message, so create/add to the partial message
      } else {
        // if this is the beginning of a message, then slice off the beginning message character
        if (f === SoM) {
          hl7 = hl7.slice(1)
        }
        data[clientAddress] = (data?.[clientAddress] || '') + hl7
        return
      }
      const msg = new Msg(hl7)
      if (channel.verbose)
        console.log('Received HL7 msg id: ', msg.get('MSH-10.1'))
      ingestMessage(msg, (ack: Msg) => {
        socket.write(SoM + ack.toString() + EoM + CR)
      })
    })
    socket.on('close', (data) => {
      if (channel.verbose)
        console.log(
          `Client ${clientAddress} disconnected`,
          `data: ${JSON.stringify(data)}`
        )
    })
  })
}
