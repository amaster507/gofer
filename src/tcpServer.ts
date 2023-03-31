import net from 'net'
import handelse from 'handelse'
import Msg from 'ts-hl7'
import { AckFunc, ChannelConfig } from './types'
import { queue } from './queue'
import { doAck } from './doAck'
import { mapOptions } from './helpers'

export const tcpServer = <
  Filt extends 'O' | 'F' | 'B' = 'B',
  Tran extends 'O' | 'F' | 'B' = 'B'
>(
  channel: ChannelConfig<Filt, Tran, 'S'>,
  ingestMessage: (msg: Msg, ack?: AckFunc) => Promise<boolean>
) => {
  const {
    host,
    port,
    SoM = '\x0B',
    EoM = '\x1C',
    CR = '\r',
    maxConnections,
  } = channel.source.tcp
  const id = channel.id
  const queueConfig = channel.source.queue
  const server = net.createServer({ allowHalfOpen: false })
  if (maxConnections !== undefined) server.setMaxListeners(maxConnections)
  server.listen(port, host, () => {
    handelse.go(`gofer:${channel.id}.onLog`, {
      log: `Server listening on ${host}:${port}`,
      channel: channel.id,
    })
  })
  server.on('connection', (socket) => {
    socket.setEncoding('utf8')

    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`
    server.listen(port, host, () => {
      handelse.go(`gofer:${channel.id}.onLog`, {
        log: `New client connection from ${clientAddress}`,
        channel: channel.id,
      })
    })

    const data: Record<string, string> = {}

    socket.on('data', (packet) => {
      handelse.go(`gofer:${channel.id}.onLog`, {
        log: `Received Data from Client ${clientAddress}:`,
        channel: channel.id,
      })
      let hl7 = packet.toString()
      const f = hl7[0]
      const e = hl7[hl7.length - 1]
      const l = hl7[hl7.length - 2]
      // if beginning of a message and there is an existing partial message, then delete it
      if (f === SoM && data?.[clientAddress] !== undefined) {
        handelse.go(`gofer:${channel.id}.onError`, {
          error: `MESSAGE LOSS: Partial message removed from ${clientAddress}`,
          channel: channel.id,
        })
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
      handelse.go(`gofer:${channel.id}.onReceive`, {
        msg,
        channel: channel.id,
      })
      if (queueConfig) {
        handelse.go(`gofer:${channel.id}.onLog`, {
          log: `Utilizing queue ${id}.source`,
          channel: channel.id,
        })
        const ack = doAck(msg, { text: 'Queued' })
        socket.write(SoM + ack.toString() + EoM + CR)
        handelse.go(`gofer:${channel.id}.onAck`, {
          channel: channel.id,
          msg: msg,
          ack: ack,
        })
        queue(
          `${id}.source`,
          (msg) => ingestMessage(msg),
          undefined,
          msg,
          mapOptions({
            ...queueConfig,
            verbose:
              queueConfig !== undefined ? queueConfig.verbose : channel.verbose,
            /**
             * FIXME: Need to find another way to pass these events.
             * These handler functions are only utilized in the first time the queue
             * class is called and then not updated after that. Need to rethink this!
             */
            // onEvents: [
            //   ...(queueConfig.onEvents ?? []),
            //   [
            //     'onQueue',
            //     (id, qId) => {
            //       handelse.go(`${channel.id}.onQueue`, {
            //         channel: channel.id,
            //         msg: msg,
            //         queue: qId,
            //         id,
            //       })
            //     },
            //   ],
            //   [
            //     'onStart',
            //     (id, qId) => {
            //       handelse.go(`${channel.id}.onQueueStart`, {
            //         channel: channel.id,
            //         msg: msg,
            //         queue: qId,
            //         id,
            //       })
            //     },
            //   ],
            //   [
            //     'onRetry',
            //     (id, qId) => {
            //       handelse.go(`${channel.id}.onQueueRetry`, {
            //         channel: channel.id,
            //         msg: msg,
            //         queue: qId,
            //         id,
            //       })
            //     },
            //   ],
            //   [
            //     'onFail',
            //     (id, qId) => {
            //       handelse.go(`${channel.id}.onQueueFail`, {
            //         channel: channel.id,
            //         msg: msg,
            //         queue: qId,
            //         id,
            //       })
            //     },
            //   ],
            //   [
            //     'onSuccess',
            //     (id, qId) => {
            //       handelse.go(`${channel.id}.onQueueRemove`, {
            //         channel: channel.id,
            //         msg: msg,
            //         queue: qId,
            //         id,
            //       })
            //     },
            //   ],
            // ],
          })
        )
      } else {
        ingestMessage(msg, (ack: Msg) => {
          socket.write(SoM + ack.toString() + EoM + CR)
        })
      }
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
