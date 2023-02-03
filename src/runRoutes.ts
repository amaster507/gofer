import { StoreConfig } from 'gofer-stores'
import { store } from './initStores'
import { RunRouteFunc, RunRoutesFunc } from './types'

export const runRoutes: RunRoutesFunc = async (channel, msg) =>
  Promise.all(channel?.routes?.map((route) => runRoute(route, msg)) || []).then(
    (res) => !res.some((r) => !r)
  )

export const runRoute: RunRouteFunc = async (route, msg) => {
  let filtered = false
  return Promise.all(
    route.map((flow) => {
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
          console.log('TOOD: Implement TCP destination connector')
          console.log({ flow, msg })
          return true
        }
        const storeConfig = flow as StoreConfig
        return store(storeConfig, msg) ?? false
      }
      console.log('FIXME: Unknown flow type not yet implemented')
      console.log({ flow })
      return false
    })
  ).then((res) => !res.some((r) => !r))
}
