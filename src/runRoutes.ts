import { StoreConfig } from 'gofer-stores'
import { doAck } from './doAck'
import { store } from './initStores'
import { mapOptions, queue } from './queue'
import { tcpClient } from './tcpClient'
import { RunRouteFunc, RunRoutesFunc, TcpConfig } from './types'

export const runRoutes: RunRoutesFunc = async (channel, msg) => {
  const routes = channel?.routes ?? []
  return Promise.all(
    routes?.map((route) => {
      if (route.queue) {
        const options = mapOptions(route.queue)
        return new Promise<boolean>((res) => {
          queue(
            `${channel.id}.route.${route.id}`,
            (msg) => runRoute(channel.id, route.flows, msg),
            undefined,
            msg,
            options
          )
          return res(true)
        })
      }
      return runRoute(channel.id, route.flows, msg)
    }) || []
  ).then((res) => !res.some((r) => !r))
}

export const runRoute: RunRouteFunc = async (channelId, route, msg) => {
  let filtered = false

  const flows: (boolean | Promise<boolean>)[] = []
  let flowIndex = 0
  for (const namedFlow of route) {
    flowIndex++
    const flow = namedFlow.flow
    if (filtered) return false
    if (typeof flow === 'function') {
      const filterOrTransform = flow(msg)
      if (typeof filterOrTransform === 'boolean') {
        filtered = !filterOrTransform
        flows.push(true)
        continue
      }
      msg = filterOrTransform
      flows.push(true)
      continue
    }
    if (typeof flow === 'object') {
      if (flow.hasOwnProperty('tcp')) {
        const tcpConfig = flow as unknown as TcpConfig<'O'>
        if (namedFlow.queue) {
          const queyConfig = namedFlow.queue
          /**
           * NOTE: Since we are using a queue, we can't use the tcpClient response to set
           * the msg. We need to use the queue's response to set the msg.
           */
          flows.push(
            new Promise<boolean>((res) => {
              queue(
                `${channelId}.${namedFlow.id}.tcp.${flowIndex}`,
                (msg) =>
                  tcpClient(tcpConfig, msg)
                    .then(() => true)
                    .catch(() => false),
                undefined,
                msg,
                mapOptions(queyConfig)
              )
              return res(true)
            })
          )
          // set the msg to a dummy ack message so that the next flow can use it.
          msg = doAck(msg, { text: 'Queued' })
          continue
        }
        msg = await tcpClient(tcpConfig, msg)
        flows.push(true)
        continue
      }
      const storeConfig = flow as StoreConfig
      flows.push(store(storeConfig, msg) ?? false)
      continue
    }
    console.log('FIXME: Unknown flow type not yet implemented')
    console.log({ flow })
    return false
  }
  return Promise.all(flows).then((res) => !res.some((r) => !r))
}
