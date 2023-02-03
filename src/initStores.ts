import stores, { Store, StoreConfig } from 'gofer-stores'
import Msg from 'ts-hl7'
import { hash } from './hash'
import {
  ChannelConfig,
  // Connection
} from './types'

const hashedStores: Record<string, Store> = {}

export const initStores = (config: ChannelConfig[]) => {
  const routeStores: StoreConfig[] = []
  config.forEach((channel) => {
    // TODO: also implement source db initialization
    routeStores.push(
      ...(channel.ingestion.filter((flow) => {
        if (typeof flow === 'object') {
          return Object.keys(stores).some((store) =>
            Object.keys(flow).includes(store)
          )
        }
        return false
      }) as StoreConfig[])
    )
    channel.routes?.forEach((flows) => {
      routeStores.push(
        ...(flows
          .map((flow) => {
            if (typeof flow === 'object') {
              if (
                Object.keys(stores).some((store) =>
                  Object.keys(flow).includes(store)
                )
              )
                return flow as StoreConfig
              // TODO: also implement destination db initialization
              // if (flow.hasOwnProperty('db'))
              //   return (flow as Connection<'O'>).db as StoreConfig
            }
            return undefined
          })
          .filter((flow) => typeof flow !== 'undefined') as StoreConfig[])
      )
    })
    return routeStores
  })

  routeStores.forEach((storeConfig) => {
    const STORE = Object.keys(storeConfig)[0] as keyof typeof storeConfig
    if (STORE !== undefined) {
      hashedStores[hash(storeConfig)] = new stores[STORE](
        storeConfig[STORE]
      ) as Store
    }
  })
  return hashedStores
}

export const getStore = (config: StoreConfig): Store | undefined =>
  hashedStores?.[hash(config)]

export const store = (config: StoreConfig, msg: Msg) =>
  getStore(config)?.store(msg)
