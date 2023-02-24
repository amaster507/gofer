import { StoreConfig } from 'gofer-stores'
import { store } from './initStores'
import { tcpClient } from './tcpClient'
import {
  RouteFlow,
  RouteFlowNamed,
  RunRouteFunc,
  RunRoutesFunc,
  TcpConfig,
} from './types'

export const runRoutes: RunRoutesFunc = async (channel, msg) => {
  const routes = channel?.routes?.map((route) => {
    const flows = route.flows
    return (flows as (RouteFlow | RouteFlowNamed)[]).map((flow) => {
      if (typeof flow === 'object' && flow.hasOwnProperty('flow')) {
        flow = (flow as RouteFlowNamed).flow
      }
      return flow as RouteFlow
    })
  })
  return Promise.all(routes?.map((route) => runRoute(route, msg)) || []).then(
    (res) => !res.some((r) => !r)
  )
}

export const runRoute: RunRouteFunc = async (route, msg) => {
  let filtered = false

  const flows: (boolean | Promise<boolean>)[] = []

  for (const flow of route) {
    if (filtered) return false
    if (typeof flow === 'function') {
      const filterOrTransform = flow(msg)
      if (typeof filterOrTransform === 'boolean') {
        filtered = !filterOrTransform
        return true
      }
      msg = filterOrTransform
      return true
    }
    if (typeof flow === 'object') {
      if (flow.hasOwnProperty('tcp')) {
        const tcpConfig = flow as unknown as TcpConfig<'O'>
        msg = await tcpClient(tcpConfig, msg)
        return true
      }
      const storeConfig = flow as StoreConfig
      return store(storeConfig, msg) ?? false
    }
    console.log('FIXME: Unknown flow type not yet implemented')
    console.log({ flow })
    return false
  }
  return Promise.all(flows).then((res) => !res.some((r) => !r))
}
